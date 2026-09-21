import { Router } from "express";
import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import { requireAdmin } from "../middleware/admin.js";
import { createNotification } from "../lib/notifications.js";

const router = Router();
router.use(requireAdmin);

router.post("/", async (request, response) => {
  const registrationCode = typeof request.body.registrationCode === "string" ? request.body.registrationCode.trim() : "";
  const eventId = typeof request.body.eventId === "string" ? request.body.eventId.trim() : "";
  if (!registrationCode) return response.status(400).json({ message: "Invalid event pass" });
  if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) return response.status(400).json({ message: "A valid event is required" });

  const registration = await Registration.findOne({ registrationCode }).populate("studentId").populate("eventId");
  const student = registration?.studentId as unknown as { name?: string } | null;
  const event = registration?.eventId as unknown as { _id?: mongoose.Types.ObjectId; title?: string } | null;
  if (!registration || !student || !event) return response.status(404).json({ message: "Invalid event pass" });
  if (eventId && String(event._id) !== eventId) return response.status(409).json({ message: "This pass belongs to another event." });
  if (registration.registrationStatus !== "approved") return response.status(409).json({ message: "This registration is not approved." });
  if (["checked_in", "checked-in"].includes(registration.checkInStatus)) {
    return response.status(409).json({ message: "Already checked in", registration });
  }

  const checkedInAt = new Date();
  const updated = await Registration.findOneAndUpdate(
    { _id: registration._id, registrationStatus: "approved", checkInStatus: { $nin: ["checked_in", "checked-in"] } },
    { checkInStatus: "checked_in", checkedInAt },
    { new: true },
  ).populate("studentId").populate("eventId");
  if (!updated) {
    const current = await Registration.findById(registration._id).populate("studentId").populate("eventId");
    if (current && ["checked_in", "checked-in"].includes(current.checkInStatus)) return response.status(409).json({ message: "Already checked in", registration: current });
    return response.status(409).json({ message: "This registration could not be checked in." });
  }
  const studentId = (registration.studentId as unknown as { _id?: unknown } | null)?._id ?? registration.studentId;
  await createNotification({
    studentId: String(studentId),
    title: "Check-in successful",
    message: `You checked in successfully for ${event.title}.`,
    type: "check_in_confirmation",
    eventId: event._id,
    registrationId: registration._id,
    dedupeKey: `${registration._id}:check_in_confirmation`,
  });
  response.json({ message: "CHECK-IN SUCCESSFUL", registration: updated });
});

export default router;