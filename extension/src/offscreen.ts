import {
  VAD_HIGHPASS_CUTOFF_HZ,
  VAD_MAX_SEGMENT_DURATION_MS,
  VAD_MIME_TYPE_CANDIDATES,
  VAD_MIN_SPEECH_DURATION_MS,
  VAD_POLL_INTERVAL_MS,
  VAD_SILENCE_DURATION_MS,
  VAD_VOLUME_THRESHOLD,
} from "./config";

// Runs inside the offscreen document background.ts creates (see its
// FLUENT_START_TAB_CAPTURE handler) — the only place in MV3 that can call
// getUserMedia() against a chrome.tabCapture stream id. Ports the same
// volume-based VAD approach as frontend/src/hooks/useGeminiTranscription.ts
// (highpass filter -> analyser -> silence-bounded MediaRecorder segments) to
// plain DOM APIs, since this document has no React runtime.

interface StartMessage {
  type: "FLUENT_OFFSCREEN_START";
  streamId: string;
  tabId: number;
}
interface StopMessage {
  type: "FLUENT_OFFSCREEN_STOP";
}

interface Segment {
  recorder: MediaRecorder;
  chunks: Blob[];
  hadSpeech: boolean;
}

let tabStream: MediaStream | null = null;
let processedStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let playbackEl: HTMLAudioElement | null = null;
let mimeType = "";
let vadIntervalId: ReturnType<typeof setInterval> | null = null;
let currentTabId: number | null = null;
let currentSegment: Segment | null = null;

let segmentStartAt = 0;
let speechAccumulatedMs = 0;
let lastAboveThresholdAt = 0;

function pickMimeType(): string {
  for (const candidate of VAD_MIME_TYPE_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

function resetSegmentTracking() {
  segmentStartAt = Date.now();
  speechAccumulatedMs = 0;
  lastAboveThresholdAt = 0;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000; // avoids a call-stack overflow spreading a huge array at once
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function sendSegment(blob: Blob, blobMimeType: string) {
  if (currentTabId === null || blob.size === 0) return;
  const audioBase64 = await blobToBase64(blob);
  void chrome.runtime.sendMessage({
    type: "FLUENT_TAB_SEGMENT_READY",
    tabId: currentTabId,
    audioBase64,
    mimeType: blobMimeType,
  }).catch(() => {});
}

function startRecorder() {
  if (!processedStream) return;
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(processedStream, mimeType ? { mimeType } : undefined);
  const segment: Segment = { recorder, chunks, hadSpeech: false };

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.onstop = () => {
    if (!segment.hadSpeech || chunks.length === 0) return;
    void sendSegment(new Blob(chunks, { type: mimeType || "audio/webm" }), mimeType || "audio/webm");
  };

  recorder.start();
  currentSegment = segment;
  resetSegmentTracking();
}

function finalizeCurrentSegment() {
  const segment = currentSegment;
  if (!segment) return;
  segment.hadSpeech = speechAccumulatedMs >= VAD_MIN_SPEECH_DURATION_MS;
  if (segment.recorder.state !== "inactive") segment.recorder.stop();
}

function cutSegment() {
  finalizeCurrentSegment();
  // Start the replacement recorder immediately (same stream) so there's no
  // window where tab audio isn't being captured by some recorder.
  startRecorder();
}

function vadTick() {
  if (!analyser || !audioContext) return;
  if (audioContext.state === "suspended") void audioContext.resume().catch(() => {});

  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const centered = (data[i] - 128) / 128;
    sumSquares += centered * centered;
  }
  const rms = Math.sqrt(sumSquares / data.length);
  const now = Date.now();

  if (rms >= VAD_VOLUME_THRESHOLD) {
    speechAccumulatedMs += VAD_POLL_INTERVAL_MS;
    lastAboveThresholdAt = now;
  }

  const silenceAfterSpeech =
    speechAccumulatedMs >= VAD_MIN_SPEECH_DURATION_MS &&
    lastAboveThresholdAt > 0 &&
    now - lastAboveThresholdAt >= VAD_SILENCE_DURATION_MS;
  const hitSafetyCap = now - segmentStartAt >= VAD_MAX_SEGMENT_DURATION_MS;

  if (silenceAfterSpeech || hitSafetyCap) cutSegment();
}

async function start(streamId: string, tabId: number) {
  currentTabId = tabId;
  mimeType = pickMimeType();

  // Chrome's tab-capture getUserMedia constraint shape predates the standard
  // MediaTrackConstraints type — no lib.dom.d.ts/@types/chrome typing covers
  // it, hence the cast.
  const constraints = {
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  } as unknown as MediaStreamConstraints;

  try {
    tabStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    // A tabCapture streamId is only valid for a few seconds — if the
    // offscreen document had to be created from scratch first, this can
    // fail with no other symptom than silence, which otherwise leaves the
    // caption bar stuck on "Listening…" forever with no clue why.
    currentTabId = null;
    void chrome.runtime.sendMessage({
      type: "FLUENT_OFFSCREEN_ERROR",
      tabId,
      error: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
    return;
  }

  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(tabStream);

  // Trims low-frequency rumble ahead of the VAD tap, same as the frontend's
  // mic path — background music/hum on a video page is exactly the kind of
  // signal this is meant to filter before deciding "is someone talking".
  const highpass = audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = VAD_HIGHPASS_CUTOFF_HZ;
  source.connect(highpass);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  highpass.connect(analyser);

  const destination = audioContext.createMediaStreamDestination();
  highpass.connect(destination);
  processedStream = destination.stream;

  // Capturing the tab's audio silences it for the user (tabCapture redirects
  // the stream instead of also letting it keep playing) — play the original
  // stream back here so the video doesn't go silent while it's analyzed.
  playbackEl = new Audio();
  playbackEl.srcObject = tabStream;
  void playbackEl.play().catch(() => {});

  startRecorder();
  vadIntervalId = setInterval(vadTick, VAD_POLL_INTERVAL_MS);
}

function stop() {
  if (vadIntervalId !== null) {
    clearInterval(vadIntervalId);
    vadIntervalId = null;
  }
  finalizeCurrentSegment();
  currentSegment = null;

  tabStream?.getTracks().forEach((track) => track.stop());
  tabStream = null;
  processedStream = null;
  void audioContext?.close().catch(() => {});
  audioContext = null;
  analyser = null;

  if (playbackEl) {
    playbackEl.pause();
    playbackEl.srcObject = null;
    playbackEl = null;
  }
  currentTabId = null;
}

chrome.runtime.onMessage.addListener((message: StartMessage | StopMessage) => {
  if (message?.type === "FLUENT_OFFSCREEN_START") {
    void start(message.streamId, message.tabId);
  } else if (message?.type === "FLUENT_OFFSCREEN_STOP") {
    stop();
  }
});
