import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { put } from "@vercel/blob";
import Event from "../models/Event.js";
import { requireAdmin } from "../middleware/admin.js";
import Registration from "../models/Registration.js";
import { validateEventInput } from "../lib/eventValidation.js";
import { notifyAllStudents } from "../lib/notifications.js";

const router = Router();
const uploadDir = [
  path.resolve(process.cwd(), "uploads"),
  path.resolve(process.cwd(), "backend", "uploads"),
].find((dir) => fs.existsSync(dir)) ?? path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Only JPEG, PNG, and WEBP images are allowed."));
    }
    callback(null, true);
  },
});

async function storePoster(file: Express.Multer.File) {
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`event-posters/${filename}`, file.buffer, { access: "public" });
    return blob.url;
  }
  const localPath = path.join(uploadDir, filename);
  fs.writeFileSync(localPath, file.buffer);
  return `/uploads/${filename}`;
}

router.get("/", async (request, response) => {
  const { search, category, department } = request.query;
  const filter: Record<string, unknown> = { status: "Published" };
  if (search) filter.$or = [{ title: { $regex: String(search), $options: "i" } }, { description: { $regex: String(search), $options: "i" } }];
  if (category) filter.category = category;
  if (department) filter.department = department;
  const events = await Event.find(filter).sort({ date: -1, createdAt: -1 });
  const result = await Promise.all(events.map(async (event) => {
    const registrationCount = await Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" } });
    return { ...event.toObject(), registrationCount, availableSeats: Math.max((event.maxParticipants ?? 0) - registrationCount, 0) };
  }));
  response.json(result);
});

router.get("/:id", async (request, response) => {
  const event = await Event.findOne({ _id: request.params.id, status: "Published" });
  if (!event) return response.status(404).json({ message: "Published event not found" });
  const registrationCount = await Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" } });
  response.json({ ...event.toObject(), registrationCount, availableSeats: Math.max((event.maxParticipants ?? 0) - registrationCount, 0) });
});

router.post("/", requireAdmin, (request, response, next) => {
  upload.single("posterFile")(request, response, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return response.status(413).json({ message: "Image is too large. Please choose a smaller image." });
      }
      return response.status(400).json({ message: error instanceof Error ? error.message : "Invalid image upload." });
    }
    next();
  });
}, async (request, response) => {
  const payload = { ...request.body };
  const posterFile = (request as typeof request & { file?: Express.Multer.File }).file;
  const posterUrl = posterFile ? await storePoster(posterFile) : "";
  const parsedAllowStudentRegistrations = payload.allowStudentRegistrations === "false" ? false : payload.allowStudentRegistrations === "true" ? true : Boolean(payload.allowStudentRegistrations ?? true);
  const parsedRegistrationEnabled = payload.registrationEnabled === "false" ? false : payload.registrationEnabled === "true" ? true : Boolean(payload.registrationEnabled ?? parsedAllowStudentRegistrations);
  const normalized = {
    ...payload,
    title: typeof payload.title === "string" ? payload.title.trim() : payload.title,
    description: typeof payload.description === "string" ? payload.description.trim() : payload.description,
    category: typeof payload.category === "string" ? payload.category.trim() : payload.category,
    department: typeof payload.department === "string" ? payload.department.trim() : payload.department,
    venue: typeof payload.venue === "string" ? payload.venue.trim() : payload.venue,
    coordinator: typeof payload.coordinator === "string" ? payload.coordinator.trim() : payload.coordinator,
    rules: typeof payload.rules === "string" ? payload.rules : "",
    maxParticipants: Number(payload.maxParticipants ?? 0),
    registrationDeadline: payload.registrationDeadline,
    poster: posterUrl || (typeof payload.poster === "string" ? payload.poster : (typeof payload.image === "string" ? payload.image : "")),
    image: posterUrl || (typeof payload.image === "string" ? payload.image : (typeof payload.poster === "string" ? payload.poster : "")),
    registrationEnabled: parsedRegistrationEnabled,
    allowStudentRegistrations: parsedAllowStudentRegistrations,
    status: payload.status ?? "Published",
  };

  const errors = validateEventInput(normalized);
  if (Object.keys(errors).length) return response.status(400).json({ message: "Complete all required fields.", errors });

  try {
    const event = await Event.create(normalized);
    if (event.status === "Published") await notifyAllStudents({ title: "New event published", message: `${event.title} is now open in Campus Events.`, type: "event_published", eventId: event._id, dedupeKey: `${event._id}:event_published` });
    const registrationCount = 0;
    return response.status(201).json({ success: true, message: "Event created successfully", event: { ...event.toObject(), registrationCount, availableSeats: Math.max((event.maxParticipants ?? 0) - registrationCount, 0) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create event";
    return response.status(500).json({ success: false, message });
  }
});

export default router;