import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { backendOrigin } from "@/lib/api/utils/authFetch";
import { getPublicSubtitleSession, type SubtitleDisplaySettings } from "@/lib/api/subtitles";

interface CaptionLine {
  source: string;
  translated: string;
  speakerName: string | null;
}

// Standalone, full-screen "second display" — reached via a plain
// ?subtitles=<code> URL (see main.tsx), no login, no app chrome. Connects to
// the backend's unauthenticated /subtitles socket namespace and just
// renders whatever gets relayed (see backend subtitles.service.pushText).
export default function SubtitleViewer({ code }: { code: string }) {
  const [settings, setSettings] = useState<SubtitleDisplaySettings | null>(null);
  const [line, setLine] = useState<CaptionLine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicSubtitleSession(code)
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        if (!cancelled) setLoadError("This subtitle link isn't active — ask the presenter for a new one.");
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    const socket = io(`${backendOrigin()}/subtitles`, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join", code));
    socket.on("subtitle:text", (payload: CaptionLine) => setLine(payload));
    socket.on("subtitle:update", (payload: SubtitleDisplaySettings) => setSettings(payload));
    return () => {
      socket.disconnect();
    };
  }, [code]);

  if (loadError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white/70 px-8 text-center font-['DM_Sans']">
        <p>{loadError}</p>
      </div>
    );
  }

  const fontSize = settings?.fontSize ?? 32;
  const fontColor = settings?.fontColor ?? "#FFFFFF";
  const backgroundColor = settings?.backgroundColor ?? "#000000";
  const inactive = settings && settings.status !== "active";

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-10 text-center transition-colors duration-300"
      style={{ backgroundColor }}
    >
      {inactive ? (
        <p style={{ color: fontColor, opacity: 0.6, fontSize: 18 }} className="font-['DM_Sans']">
          This subtitle session has ended.
        </p>
      ) : line ? (
        <div className="flex flex-col gap-3 max-w-4xl">
          {line.speakerName && (
            <p style={{ color: fontColor, opacity: 0.6, fontSize: fontSize * 0.4 }} className="font-['DM_Mono'] uppercase tracking-widest">
              {line.speakerName}
            </p>
          )}
          <p style={{ color: fontColor, fontSize, lineHeight: 1.3 }} className="font-['DM_Sans'] font-semibold">
            {line.translated}
          </p>
          <p style={{ color: fontColor, opacity: 0.55, fontSize: fontSize * 0.5 }} className="font-['DM_Sans'] italic">
            {line.source}
          </p>
        </div>
      ) : (
        <p style={{ color: fontColor, opacity: 0.5, fontSize: fontSize * 0.6 }} className="font-['DM_Sans'] italic">
          Waiting for the presenter to start speaking…
        </p>
      )}
    </div>
  );
}
