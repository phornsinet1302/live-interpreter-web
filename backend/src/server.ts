import { createServer } from "node:http";
import { env } from "./config/env";
import { createApp } from "./app";
import { initSocket } from "./websocket/socket";

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`API running on   http://localhost:${env.port}`);
  console.log(`Swagger UI at    http://localhost:${env.port}/api/docs`);
  console.log(`WebSocket ready  ws://localhost:${env.port}`);
});
