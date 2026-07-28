import { useCallback, useRef, useState } from "react";

// The Web Speech API's SpeechRecognition isn't in lib.dom.d.ts — TS only
// ships ambient types for it via @types/dom-speech-recognition, which this
// project doesn't depend on. Minimal shape of what we actually use.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported = () => getSpeechRecognitionCtor() !== null;

const FATAL_ERRORS = new Set(["not-allowed", "permission-denied", "service-not-allowed", "audio-capture"]);

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Chrome ends a "continuous" session after a stretch of silence (or a
  // transient "no-speech"/"network" hiccup) even though the user never
  // pressed stop. onend restarts automatically unless this flag says the
  // user actually asked to stop.
  const manualStopRef = useRef(false);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(
    (
      lang: string,
      handlers: {
        onInterim: (transcript: string) => void;
        onFinal: (transcript: string) => void;
        onError: (message: string) => void;
      }
    ) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        handlers.onError("Speech recognition isn't supported in this browser — try Chrome or Edge.");
        return;
      }

      manualStopRef.current = false;

      const createAndStart = () => {
        const recognition = new Ctor();
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let finalTranscript = "";
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) finalTranscript += result[0].transcript;
            else interimTranscript += result[0].transcript;
          }
          if (finalTranscript) handlers.onFinal(finalTranscript.trim());
          else if (interimTranscript) handlers.onInterim(interimTranscript.trim());
        };

        recognition.onerror = (event) => {
          if (FATAL_ERRORS.has(event.error)) {
            manualStopRef.current = true;
            handlers.onError(
              event.error === "audio-capture"
                ? "No microphone found — check your input device and try again."
                : "Microphone access was denied — allow it in your browser settings and try again."
            );
          }
          // Non-fatal errors (no-speech, network, aborted) fall through to
          // onend, which restarts the session automatically.
        };

        recognition.onend = () => {
          if (manualStopRef.current) {
            setListening(false);
            return;
          }
          createAndStart();
        };

        recognitionRef.current = recognition;
        recognition.start();
      };

      setListening(true);
      createAndStart();
    },
    []
  );

  return { listening, start, stop };
}
