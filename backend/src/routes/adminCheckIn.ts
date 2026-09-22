import { Router } from "express";
import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import CheckIn from "../models/CheckIn.js";
import { requireAdmin } from "../middleware/admin.js";
import { createNotification } from "../lib/notifications.js";

const router = Router();
router.use(requireAdmin);

router.get("/", async (_request, response) => {
  const checkIns = await CheckIn.find().sort({ checkedInAt: -1 }).limit(100).lean();
  response.json(checkIns);
});

router.post("/", async (request, response) => {
  const registrationCode = typeof request.body.registrationCode === "string" ? request.body.registrationCode.trim() : "";
  const eventId = typeof request.body.eventId === "string" ? request.body.eventId.trim() : "";
    if (!registrationCode) return response.status(400).json({ message: "Registration not found." });
  if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) return response.status(400).json({ message: "A valid event is required" });

    const lookup: Record<string, unknown>[] = [{ registrationCode }, { registrationId: registrationCode }];
    if (mongoose.Types.ObjectId.isValid(registrationCode)) lookup.push({ _id: registrationCode });
    const registration = await Registration.findOne({ $or: lookup }).populate("studentId").populate("eventId");
    if (!registration) return response.status(404).json({ message: "Registration not found." });
    const student = registration.studentId as unknown as { _id?: mongoose.Types.ObjectId; name?: string; email?: string } | null;
    const event = registration.eventId as unknown as { _id?: mongoose.Types.ObjectId; title?: string } | null;
    if (!student) return response.status(404).json({ message: "Student not found." });
    if (!event) return response.status(404).json({ message: "Event not found." });
    if (eventId && String(event._id) !== eventId) return response.status(409).json({ message: "This registration is not for the selected event." });
    if (registration.registrationStatus !== "approved") return response.status(409).json({ message: "This registration is not approved." });
  if (["checked_in", "checked-in"].includes(registration.checkInStatus)) {
      return response.status(409).json({ message: "This student is already checked in for this event.", registration });
  }

  const checkedInAt = new Date();
  const studentId = (registration.studentId as unknown as { _id?: unknown } | null)?._id ?? registration.studentId;
  let checkIn;
  try {
    checkIn = await CheckIn.create({
      registrationId: registration._id,
      studentId: studentId,
      studentName: (student as { name?: string }).name ?? "Student",
      studentEmail: (student as { email?: string }).email ?? "",
      eventId: event._id,
      eventTitle: event.title ?? "Event",
      checkedInAt,
      checkedInBy: "admin",
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return response.status(409).json({ message: "Student is already checked in." });
    throw error;
  }
  const updated = await Registration.findOneAndUpdate(
    { _id: registration._id, registrationStatus: "approved", checkInStatus: { $nin: ["checked_in", "checked-in"] } },
    { checkInStatus: "checked_in", checkedInAt },
    { new: true },
  ).populate("studentId").populate("eventId");
  if (!updated) {
    await CheckIn.deleteOne({ _id: checkIn._id });
    const current = await Registration.findById(registration._id).populate("studentId").populate("eventId");
    if (current && ["checked_in", "checked-in"].includes(current.checkInStatus)) return response.status(409).json({ message: "This student is already checked in for this event.", registration: current });
    return response.status(409).json({ message: "This registration could not be checked in." });
  }
  await createNotification({
    studentId: String(studentId),
    title: "Check-in successful",
    message: `Your check-in for ${event.title} was recorded successfully.`,
    type: "check_in_confirmation",
    eventId: event._id,
    registrationId: registration._id,
    dedupeKey: `${registration._id}:check_in_confirmation`,
  });
  response.json({ message: "Check-in completed successfully.", registration: updated, checkIn });
});

export default router;