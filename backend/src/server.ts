import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.port, () => {
  console.log(`API running on   http://localhost:${env.port}`);
  console.log(`Swagger UI at    http://localhost:${env.port}/api/docs`);
});
