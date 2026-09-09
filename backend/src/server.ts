import http from "node:http";
import { env } from "./config/env";
import { createApp } from "./app";
import { initSocket } from "./websocket/socket";
import { startReminderScheduler } from "./lib/reminder-scheduler";

const app = createApp();
const httpServer = http.createServer(app);
initSocket(httpServer);
startReminderScheduler();

httpServer.listen(env.port, () => {
  console.log(`API running on   http://localhost:${env.port}`);
  console.log(`Swagger UI at    http://localhost:${env.port}/api/docs`);
});
