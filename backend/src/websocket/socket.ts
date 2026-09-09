import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "@clerk/express";
import { env } from "../config/env";
import { registerConversationHandlers } from "./handlers";
import { userRoom } from "./events";

let io: SocketIOServer | undefined;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigins },
  });

  // Socket.IO's handshake is outside Express's request cycle, so it can't go
  // through getAuth(req)/clerkMiddleware() — verifyToken() is the same
  // underlying check (@clerk/backend), usable directly against a raw token.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Missing auth token"));
      return;
    }
    verifyToken(token, { secretKey: env.clerk.secretKey })
      .then((payload) => {
        socket.data.userId = payload.sub;
        next();
      })
      .catch(() => next(new Error("Invalid or expired token")));
  });

  io.on("connection", (socket) => {
    // Auto-join — notifications are per-user, so every authenticated socket
    // needs to be reachable regardless of which conversation page it's on.
    void socket.join(userRoom(socket.data.userId as string));
    registerConversationHandlers(socket);
  });

  // Deliberately unauthenticated — this is how a subtitle session gets
  // watched on a second display (FR-3): the viewer has only a shareable
  // sessionCode, not an account. Rooms here are named by sessionCode and
  // carry no persisted data or owner-identifying info — the presenter's
  // authenticated browser never connects here itself; it pushes text via
  // the normal REST API (POST .../subtitles/push), and the server is the
  // only thing that ever emits into these rooms (see subtitles.service.ts).
  io.of("/subtitles").on("connection", (socket) => {
    socket.on("join", (code: unknown) => {
      if (typeof code === "string" && code.length > 0 && code.length <= 20) {
        void socket.join(code);
      }
    });
  });

  return io;
}

// Used by services to emit after a successful DB write. Returns undefined
// before initSocket() has run (e.g. under test) — callers should no-op then.
export function getIO(): SocketIOServer | undefined {
  return io;
}
