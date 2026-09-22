import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import cors, { type CorsOptions } from "cors";
import express from "express";
import { connectToDatabase } from "./lib/db.js";
import eventsRouter from "./routes/events.js";
import registrationsRouter from "./routes/registrations.js";
import adminEventsRouter from "./routes/adminEvents.js";
import adminParticipantsRouter from "./routes/adminParticipants.js";
import adminCheckInRouter from "./routes/adminCheckIn.js";
import adminDashboardRouter from "./routes/adminDashboard.js";
import studentsRouter from "./routes/students.js";
import authRouter from "./routes/auth.js";
import notificationsRouter from "./routes/notifications.js";

const app = express();
const possibleUploadDirs = [path.resolve(process.cwd(), "uploads"), path.resolve(process.cwd(), "backend", "uploads")];
const uploadDir = possibleUploadDirs.find((dir) => fs.existsSync(dir)) ?? possibleUploadDirs[0];
fs.mkdirSync(uploadDir, { recursive: true });

const configuredFrontendOrigins = (process.env.FRONTEND_URL ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "https://clg-mgt-frontend.vercel.app",
  ...configuredFrontendOrigins,
]);
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const isVercelPreview = typeof origin === "string" && /^https:\/\/clg-mgt-frontend-[a-zA-Z0-9-]+-clg994103-9489\.vercel\.app$/.test(origin);
    callback(null, !origin || allowedOrigins.has(origin) || isVercelPreview);
  },
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/uploads", express.static(uploadDir));
app.get("/", (_request, response) => response.json({ message: "Campus Events API is running", status: "online" }));
app.get("/api/health", (_request, response) => response.json({ status: "ok", service: "campus-events-backend" }));
app.use((request, _response, next) => { request.cookies ??= {}; const header = request.headers.cookie ?? ""; for (const part of header.split(";")) { const [key, ...value] = part.trim().split("="); if (key) request.cookies[key] = decodeURIComponent(value.join("=")); } next(); });
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/admin/events", adminEventsRouter);
app.use("/api/admin/registrations", adminParticipantsRouter);
app.use("/api/admin/check-in", adminCheckInRouter);
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/students", studentsRouter);
app.use("/api/notifications", notificationsRouter);

let databaseConnection: Promise<unknown> | null = null;
export function ensureDatabaseConnection() {
  databaseConnection ??= connectToDatabase();
  return databaseConnection;
}

export default app;