import { Router } from "express";
import { randomBytes } from "node:crypto";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import { requireAdmin } from "../middleware/admin.js";
import { validateEventInput } from "../lib/eventValidation.js";
import { notifyAllStudents, notifyEventRegistrants } from "../lib/notifications.js";

const router = Router();
router.use(requireAdmin);

async function withCounts(events: Array<InstanceType<typeof Event>>) {
  return Promise.all(events.map(async (event) => ({ ...event.toObject(), registrationCount: await Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" } }) })));
}

router.get("/", async (request, response) => {
  const { search, category, department, status } = request.query;
  const filter: Record<string, unknown> = {};
  if (search) filter.$or = [{ title: { $regex: String(search), $options: "i" } }, { coordinator: { $regex: String(search), $options: "i" } }];
  if (category) filter.category = category;
  if (department) filter.department = department;
  if (status) filter.status = status;
  const events = await Event.find(filter).sort({ date: 1, startTime: 1 });
  response.json(await withCounts(events));
});

router.get("/:id", async (request, response) => {
  const event = await Event.findById(request.params.id);
  if (!event) return response.status(404).json({ message: "Event not found" });
  const registrationCount = await Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" } });
  response.json({ ...event.toObject(), registrationCount });
});

router.post("/", async (request, response) => {
  const errors = validateEventInput(request.body);
  if (Object.keys(errors).length) return response.status(400).json({ message: "Please correct the event form", errors });
  const event = await Event.create(request.body);
  if (event.status === "Published") await notifyAllStudents({ title: "New event published", message: `${event.title} is now open in Campus Events.`, type: "event_published", eventId: event._id, dedupeKey: `${event._id}:event_published` });
  response.status(201).json({ ...event.toObject(), registrationCount: 0 });
});

router.put("/:id", async (request, response) => {
  const errors = validateEventInput(request.body);
  if (Object.keys(errors).length) return response.status(400).json({ message: "Please correct the event form", errors });
  const existingEvent = await Event.findById(request.params.id);
  if (!existingEvent) return response.status(404).json({ message: "Event not found" });
  const registrationCount = await Registration.countDocuments({ eventId: existingEvent._id, registrationStatus: { $ne: "rejected" } });
  if (Number(request.body.maxParticipants) < registrationCount) return response.status(409).json({ message: `Maximum participants cannot be less than the ${registrationCount} current registrations` });
  const event = await Event.findByIdAndUpdate(request.params.id, request.body, { new: true, runValidators: true });
  if (event) {
    if (existingEvent.status !== "Published" && event.status === "Published") await notifyAllStudents({ title: "New event published", message: `${event.title} is now open in Campus Events.`, type: "event_published", eventId: event._id, dedupeKey: `${event._id}:event_published` });
    else if (event.status === "Cancelled" && existingEvent.status !== "Cancelled") await notifyEventRegistrants(event._id, { title: "Event cancelled", message: `${event.title} has been cancelled.`, type: "event_cancelled", dedupeKey: `${event._id}:event_cancelled` });
    else if (event.status === "Published") await notifyEventRegistrants(event._id, { title: "Event updated", message: `${event.title} has been updated.`, type: "event_updated", dedupeKey: `${event._id}:event_updated:${event.updatedAt?.getTime() ?? Date.now()}` });
  }
  response.json({ ...event!.toObject(), registrationCount });
});

router.patch("/:id/registration", async (request, response) => {
  if (typeof request.body.registrationEnabled !== "boolean") return response.status(400).json({ message: "registrationEnabled must be true or false" });
  const event = await Event.findByIdAndUpdate(request.params.id, { registrationEnabled: request.body.registrationEnabled }, { new: true, runValidators: true });
  if (!event) return response.status(404).json({ message: "Event not found" });
  const registrationCount = await Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" } });
  response.json({ ...event.toObject(), registrationCount });
});

router.get("/:id/check-in-qr", async (request, response) => {
  const event = await Event.findById(request.params.id).select("+checkInToken");
  if (!event) return response.status(404).json({ message: "Event not found" });
  if (!event.checkInToken) {
    event.checkInToken = randomBytes(32).toString("hex");
    await event.save();
  }
  response.json({ token: event.checkInToken });
});

router.delete("/:id", async (request, response) => {
  const event = await Event.findByIdAndDelete(request.params.id);
  if (!event) return response.status(404).json({ message: "Event not found" });
  await Registration.deleteMany({ eventId: event._id });
  response.status(204).send();
});

export default router;