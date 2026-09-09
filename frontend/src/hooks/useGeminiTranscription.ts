import { useCallback, useRef, useState } from "react";
import { estimatePitchFromSamples } from "@/lib/audio/pitchDetection";

// Volume-based voice-activity detection: continuously records the mic into
// short, silence-bounded segments and hands each one off to the caller,
// which sends it to the backend for Gemini transcription. Used for
// languages where the browser's built-in speech recognizer (see
// useSpeechRecognition) isn't accurate enough — see GEMINI_TRANSCRIPTION_LANGUAGES.
//
// FR-11 noise cancellation (this hook's raw-audio path only — the Web Speech
// API path in useSpeechRecognition captures its own audio internally with no
// way for the page to attach constraints or a processing graph to it):
// getUserMedia's echoCancellation/noiseSuppression/autoGainControl
// constraints below hand off to the browser/OS's own DSP for echo and
// stationary background noise, and the high-pass filter in start() trims
// low-frequency rumble (AC hum, fans, traffic) that those constraints don't
// reliably target — applied to the actual recorded/transcribed audio, not
// just the VAD tap, via the MediaStreamDestination routing in start().

// First-pass constants — VOLUME_THRESHOLD in particular will likely need
// real-device calibration (mic gain varies a lot by device/OS).
const VOLUME_THRESHOLD = 0.02; // RMS, 0-1 scale
const SILENCE_DURATION_MS = 500; // pause length that ends an utterance
const MIN_SPEECH_DURATION_MS = 300; // cumulative above-threshold time to count as real speech
const MAX_SEGMENT_DURATION_MS = 15000; // hard cap so one continuous utterance can't grow unbounded
const VAD_POLL_INTERVAL_MS = 50;
const HIGHPASS_CUTOFF_HZ = 90; // just below the speech fundamental range

const MIME_TYPE_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of MIME_TYPE_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function isGeminiTranscriptionSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

interface Handlers {
  onSegmentReady: (audioBlob: Blob, mimeType: string) => void;
  onListeningChange: (isSpeaking: boolean) => void;
  onError: (message: string) => void;
}

// Each recording segment is its own object so a segment's outcome (whether
// it had real speech, and its audio chunks) stays correct even though
// MediaRecorder's start/stop events fire asynchronously — nothing here
// depends on a shared "current segment" ref that could get reset out from
// under an in-flight stop() callback.
interface Segment {
  recorder: MediaRecorder;
  chunks: Blob[];
  hadSpeech: boolean;
}

export function useGeminiTranscription() {
  const [listening, setListening] = useState(false);
  // The raw mic stream — kept only so stop() can release the physical
  // device; MediaRecorder never reads from this directly.
  const streamRef = useRef<MediaStream | null>(null);
  // The filtered stream (post highpass) that MediaRecorder actually records
  // from — see the WebAudio graph built in start().
  const processedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const segmentRef = useRef<Segment | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef = useRef("");
  const handlersRef = useRef<Handlers | null>(null);
  const manualStopRef = useRef(false);

  // Tracking for whichever segment is currently recording.
  const segmentStartRef = useRef(0);
  const speechAccumulatedRef = useRef(0);
  const lastAboveThresholdRef = useRef(0);
  const segmentIsSpeakingRef = useRef(false);

  // FR-8 automatic speaker detection reuses THIS hook's mic stream/analyser
  // rather than opening a second, independent getUserMedia stream — two
  // concurrent opens of the same physical mic can silently starve one of
  // them on some drivers (this broke live transcription entirely on at
  // least one real device when a separate pitch-tracking stream was tried).
  const pitchSamplesRef = useRef<{ at: number; hz: number }[]>([]);
  const pitchBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const resetSegmentTracking = useCallback(() => {
    segmentStartRef.current = Date.now();
    speechAccumulatedRef.current = 0;
    lastAboveThresholdRef.current = 0;
    segmentIsSpeakingRef.current = false;
  }, []);

  const startRecorder = useCallback(() => {
    const stream = processedStreamRef.current;
    if (!stream) return;

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, mimeTypeRef.current ? { mimeType: mimeTypeRef.current } : undefined);
    const segment: Segment = { recorder, chunks, hadSpeech: false };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (!segment.hadSpeech || chunks.length === 0) return;
      const blob = new Blob(chunks, { type: mimeTypeRef.current || "audio/webm" });
      if (blob.size > 0) handlersRef.current?.onSegmentReady(blob, mimeTypeRef.current || blob.type);
    };

    recorder.start();
    segmentRef.current = segment;
    resetSegmentTracking();
  }, [resetSegmentTracking]);

  // Snapshots whether the segment about to end had real speech (must happen
  // before resetSegmentTracking runs for the next segment) and stops it.
  const finalizeCurrentSegment = useCallback(() => {
    const segment = segmentRef.current;
    if (!segment) return;
    segment.hadSpeech = speechAccumulatedRef.current >= MIN_SPEECH_DURATION_MS;
    if (segment.recorder.state !== "inactive") segment.recorder.stop();
  }, []);

  const cutSegment = useCallback(() => {
    const wasSpeaking = segmentIsSpeakingRef.current;
    finalizeCurrentSegment();
    if (wasSpeaking) handlersRef.current?.onListeningChange(false);
    // Start the replacement recorder immediately (same stream) so there's no
    // window where audio isn't being captured by some recorder.
    startRecorder();
  }, [finalizeCurrentSegment, startRecorder]);

  const vadTick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const centered = (data[i] - 128) / 128;
      sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    const now = Date.now();

    // Same analyser, same tick — no extra mic access. Only bothers with the
    // (heavier) autocorrelation pass when there's actually signal to read.
    if (rms >= VOLUME_THRESHOLD && audioContextRef.current) {
      if (!pitchBufferRef.current || pitchBufferRef.current.length !== analyser.fftSize) {
        pitchBufferRef.current = new Float32Array(analyser.fftSize);
      }
      analyser.getFloatTimeDomainData(pitchBufferRef.current);
      const hz = estimatePitchFromSamples(pitchBufferRef.current, audioContextRef.current.sampleRate);
      if (hz !== null) {
        pitchSamplesRef.current.push({ at: now, hz });
        const cutoff = now - 30000;
        while (pitchSamplesRef.current.length && pitchSamplesRef.current[0].at < cutoff) pitchSamplesRef.current.shift();
      }
    }

    if (rms >= VOLUME_THRESHOLD) {
      speechAccumulatedRef.current += VAD_POLL_INTERVAL_MS;
      lastAboveThresholdRef.current = now;
      if (!segmentIsSpeakingRef.current && speechAccumulatedRef.current >= MIN_SPEECH_DURATION_MS) {
        segmentIsSpeakingRef.current = true;
        handlersRef.current?.onListeningChange(true);
      }
    }

    const silenceAfterSpeech =
      speechAccumulatedRef.current >= MIN_SPEECH_DURATION_MS &&
      lastAboveThresholdRef.current > 0 &&
      now - lastAboveThresholdRef.current >= SILENCE_DURATION_MS;
    const hitSafetyCap = now - segmentStartRef.current >= MAX_SEGMENT_DURATION_MS;

    if (silenceAfterSpeech || hitSafetyCap) cutSegment();
  }, [cutSegment]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    // Finalize whatever's mid-flight so a manual stop mid-sentence doesn't
    // drop the last utterance.
    finalizeCurrentSegment();
    segmentRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    processedStreamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    pitchSamplesRef.current = [];
    setListening(false);
  }, [finalizeCurrentSegment]);

  // Averages every valid pitch sample recorded since `sinceMs` — called once
  // per finalized segment to fingerprint whoever just spoke (FR-8).
  const getAveragePitchSince = useCallback((sinceMs: number): number | null => {
    const relevant = pitchSamplesRef.current.filter((s) => s.at >= sinceMs);
    if (relevant.length === 0) return null;
    return relevant.reduce((sum, s) => sum + s.hz, 0) / relevant.length;
  }, []);

  const start = useCallback(
    async (_sourceLanguage: string, handlers: Handlers) => {
      handlersRef.current = handlers;

      if (!isGeminiTranscriptionSupported()) {
        handlers.onError("Audio recording isn't supported in this browser — try Chrome or Edge.");
        return;
      }

      manualStopRef.current = false;
      mimeTypeRef.current = pickMimeType();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        handlers.onError(
          name === "NotFoundError"
            ? "No microphone found — check your input device and try again."
            : "Microphone access was denied — allow it in your browser settings and try again."
        );
        return;
      }

      if (manualStopRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const audioContext = new AudioContext();
      void audioContext.resume().catch(() => {});
      const source = audioContext.createMediaStreamSource(stream);

      // High-pass filter ahead of both the VAD tap and the recorded output —
      // trims rumble the browser's own constraints don't target (see the
      // file-level comment above).
      const highpass = audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = HIGHPASS_CUTOFF_HZ;
      source.connect(highpass);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      highpass.connect(analyser);

      // MediaRecorder needs a real MediaStream, not a WebAudio node — routing
      // the filtered signal through a destination node makes the filtered
      // audio (not the raw mic feed) what actually gets sent for transcription.
      const destination = audioContext.createMediaStreamDestination();
      highpass.connect(destination);
      processedStreamRef.current = destination.stream;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      startRecorder();
      vadIntervalRef.current = setInterval(vadTick, VAD_POLL_INTERVAL_MS);
      setListening(true);
    },
    [startRecorder, vadTick]
  );

  return { listening, start, stop, getAveragePitchSince };
}
