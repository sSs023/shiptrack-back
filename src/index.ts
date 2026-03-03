import app from "./server.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

async function main() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`ShipTrack API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
