import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env";
import { verifyAccessToken } from "../lib/jwt";
import { registerHandlers } from "./handlers";

let io: Server | undefined;

// Every socket must present the same access token used for REST calls.
// Rejects the handshake outright rather than letting anonymous sockets in.
function authenticate(socket: Socket, next: (err?: Error) => void) {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    socket.handshake.headers.authorization?.replace(/^Bearer /, "");

  if (!token) return next(new Error("Missing authentication token"));

  try {
    socket.data.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: env.corsOrigins },
  });

  io.use(authenticate);
  io.on("connection", (socket) => registerHandlers(io!, socket));

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO server has not been initialized yet");
  return io;
}
