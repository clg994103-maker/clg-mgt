import { Router } from "express";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import Student from "../models/Student.js";
import { requireStudent } from "../middleware/student.js";
import { createNotification } from "../lib/notifications.js";

const router = Router();

router.get("/verify/:registrationId", async (request, response) => {
  const registrationId = String(request.params.registrationId ?? "").trim();
  const registration = await Registration.findOne({ $or: [{ registrationCode: registrationId }, { registrationId }] }).populate("eventId").populate("studentId", "name email").lean() as unknown as {
    registrationId?: string;
    registrationCode?: string;
    registrationStatus?: string;
    studentId?: { name?: string; email?: string } | null;
    eventId?: { title?: string; date?: Date | string; venue?: string } | null;
  } | null;
  if (!registration) return response.status(404).json({ success: false, message: "This QR code is not valid or the registration no longer exists." });
  const student = registration.studentId as unknown as { name?: string; email?: string } | null;
  const event = registration.eventId as unknown as { title?: string; date?: Date | string; venue?: string } | null;
  if (!student || !event) return response.status(404).json({ success: false, message: "This QR code is not valid or the registration no longer exists." });
  response.json({ success: true, registration: {
    registrationId: registration.registrationCode ?? registration.registrationId,
    studentName: student.name ?? "Student",
    email: student.email ?? "",
    eventName: event.title ?? "Event",
    eventDate: event.date ? new Date(event.date).toISOString().slice(0, 10) : "",
    venue: event.venue ?? "",
    status: registration.registrationStatus,
  } });
});

router.get("/", requireStudent, async (request, response) => {
  const registrations = await Registration.find({ studentId: request.studentId }).populate("eventId").sort({ registeredAt: -1 });
  for (const registration of registrations) {
    if (!registration.registrationCode) {
      registration.registrationCode = `REG-${randomBytes(6).toString("hex").toUpperCase()}`;
      await registration.save();
    }
  }
  response.json(registrations);
});

router.get("/:id", requireStudent, async (request, response) => {
  const registration = await Registration.findOne({ _id: request.params.id, studentId: request.studentId }).populate("eventId").populate({ path: "studentId", select: "name email registerNumber department year" });
  if (!registration) return response.status(404).json({ message: "Registration not found" });
  if (!registration.registrationCode) {
    registration.registrationCode = `REG-${randomBytes(6).toString("hex").toUpperCase()}`;
    await registration.save();
  }
  response.json(registration);
});

router.post("/", requireStudent, async (request, response) => {
  if (typeof request.body.eventId !== "string" || !mongoose.Types.ObjectId.isValid(request.body.eventId)) return response.status(400).json({ message: "A valid event is required" });
  const event = await Event.findById(request.body.eventId);
  if (!event) return response.status(404).json({ message: "Event not found" });
  if (event.status !== "Published" || !event.registrationEnabled) return response.status(409).json({ message: "Registration is closed for this event" });
  if (new Date() > event.registrationDeadline) return response.status(409).json({ message: "Registration deadline has passed" });
  const registrationCount = await Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" } });
  if (registrationCount >= event.maxParticipants) return response.status(409).json({ message: "This event has reached maximum capacity" });
  const duplicate = await Registration.exists({ studentId: request.studentId, eventId: event._id, registrationStatus: { $ne: "rejected" } });
  if (duplicate) return response.status(409).json({ message: "You are already registered for this event" });
  try {
    const registration = await Registration.create({ eventId: event._id, studentId: request.studentId, registrationCode: `REG-${randomBytes(6).toString("hex").toUpperCase()}`, registrationStatus: "pending", checkInStatus: "not_checked_in" });
    await createNotification({
      studentId: request.studentId!,
      title: "Registration successful",
      message: `You successfully registered for ${event.title}.`,
      type: "registration_successful",
      eventId: event._id,
      registrationId: registration._id,
      dedupeKey: `${registration._id}:registration_successful`,
    });
    response.status(201).json(registration);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return response.status(409).json({ message: "You are already registered for this event" });
    throw error;
  }
});

router.post("/check-in", requireStudent, async (request, response) => {
  if (!await Student.exists({ _id: request.studentId })) return response.status(401).json({ message: "Student login required" });
  const token = typeof request.body.token === "string" ? request.body.token.trim() : "";
  if (!token) return response.status(400).json({ message: "A valid event QR code is required" });
  const event = await Event.findOne({ checkInToken: token }).select("+checkInToken");
  if (!event) return response.status(404).json({ message: "This QR code is not valid for an event" });
  const registration = await Registration.findOne({ eventId: event._id, studentId: request.studentId });
  if (!registration) return response.status(403).json({ message: "You are not registered for this event" });
  if (registration.registrationStatus !== "approved") return response.status(403).json({ message: "Your registration must be approved before check-in" });
  const updated = await Registration.findOneAndUpdate(
    { _id: registration._id, registrationStatus: "approved", checkInStatus: { $nin: ["checked_in", "checked-in"] } },
    { checkInStatus: "checked_in", checkedInAt: new Date() },
    { new: true },
  ).populate("eventId");
  if (!updated) return response.status(409).json({ message: "You have already checked in for this event" });
  response.json({ registration: updated, message: `Checked in successfully for ${event.title}` });
});

export default router;