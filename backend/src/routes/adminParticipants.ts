import { Router } from "express";
import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import Student from "../models/Student.js";
import Event from "../models/Event.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
const registrationStatuses = ["pending", "approved", "rejected"] as const;
router.use(requireAdmin);

router.get("/", async (request, response) => {
  const eventId = String(request.query.eventId ?? "");
  if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) return response.status(400).json({ message: "A valid event is required" });
  if (eventId && !await Event.exists({ _id: eventId })) return response.status(404).json({ message: "Event not found" });

  const status = String(request.query.status ?? "");
  if (status && !registrationStatuses.includes(status as typeof registrationStatuses[number])) return response.status(400).json({ message: "Invalid registration status" });
  const registrations = await Registration.find({ ...(eventId ? { eventId } : {}), ...(status ? { registrationStatus: status } : {}) }).populate("studentId").populate("eventId").sort({ registeredAt: -1 });
  const search = String(request.query.search ?? "").trim().toLowerCase();
  const participants = registrations.filter((registration) => {
    const student = registration.studentId as unknown as { name?: string; registerNumber?: string; department?: string; email?: string; phone?: string } | null;
    if (!student) return false;
    if (!search) return true;
    return [student.name, student.registerNumber, student.department, student.email, student.phone].some((value) => value?.toLowerCase().includes(search));
  });
  const registrationFilter = { ...(eventId ? { eventId } : {}), registrationStatus: { $ne: "rejected" } };
  const totalRegistered = await Registration.countDocuments(registrationFilter);
  const totalCheckedIn = await Registration.countDocuments({ ...registrationFilter, checkInStatus: { $in: ["checked_in", "checked-in"] } });
  const capacity = eventId
    ? (await Event.findById(eventId).select("maxParticipants"))?.maxParticipants ?? 0
    : (await Event.aggregate([{ $group: { _id: null, total: { $sum: "$maxParticipants" } } }]))[0]?.total ?? 0;
  response.json({ participants, count: participants.length, totalRegistered, totalCheckedIn, remainingParticipants: Math.max(capacity - totalRegistered, 0) });
});

router.patch("/:id/status", async (request, response) => {
  const registrationStatus = request.body.registrationStatus;
  if (!registrationStatuses.includes(registrationStatus)) return response.status(400).json({ message: "Invalid registration status" });
  if (!mongoose.Types.ObjectId.isValid(request.params.id)) return response.status(400).json({ message: "A valid registration is required" });
  const registration = await Registration.findByIdAndUpdate(request.params.id, { registrationStatus }, { new: true, runValidators: true }).populate("studentId");
  if (!registration) return response.status(404).json({ message: "Registration not found" });
  const registrationCount = await Registration.countDocuments({
    eventId: registration.eventId,
    registrationStatus: { $ne: "rejected" },
  });
  response.json({ registration, registrationCount });
});

export default router;
