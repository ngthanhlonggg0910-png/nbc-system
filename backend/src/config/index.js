import "dotenv/config";

const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.FE_URL ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export const config = {
  host: process.env.HOST ?? "localhost",
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins,
  oneSignal: {
    appId: process.env.ONESIGNAL_APP_ID,
    apiKey: process.env.ONESIGNAL_API_KEY,
  },
};
