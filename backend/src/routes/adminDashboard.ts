import { Router } from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Student from "../models/Student.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
router.use(requireAdmin);

router.get("/", async (_request, response) => {
  const now = new Date();
  const [totalStudents, totalEvents, upcomingEvents, totalRegistrations, approvedRegistrations, pendingRegistrations, checkedInParticipants, events, recentRegistrations] = await Promise.all([
    Student.countDocuments(),
    Event.countDocuments(),
    Event.find({ status: "Published", date: { $gte: now } }).sort({ date: 1, startTime: 1 }).limit(5).lean(),
    Registration.countDocuments(),
    Registration.countDocuments({ registrationStatus: "approved" }),
    Registration.countDocuments({ registrationStatus: "pending" }),
    Registration.countDocuments({ checkInStatus: { $in: ["checked_in", "checked-in"] } }),
    Event.find().sort({ date: 1 }).limit(8).lean(),
    Registration.find().populate("studentId", "name registerNumber").populate("eventId", "title date").sort({ registeredAt: -1 }).limit(6).lean(),
  ]);

  const eventRegistrationStats = await Promise.all(events.map(async (event) => {
    const [registered, checkedIn] = await Promise.all([
      Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" } }),
      Registration.countDocuments({ eventId: event._id, registrationStatus: { $ne: "rejected" }, checkInStatus: { $in: ["checked_in", "checked-in"] } }),
    ]);
    return { _id: event._id, title: event.title, date: event.date, maxParticipants: event.maxParticipants, registered, checkedIn };
  }));

  response.json({
    stats: { totalStudents, totalEvents, upcomingEvents: upcomingEvents.length, totalRegistrations, approvedRegistrations, pendingRegistrations, checkedInParticipants },
    upcomingEvents: upcomingEvents.map((event) => ({ ...event, registrationCount: eventRegistrationStats.find((item) => String(item._id) === String(event._id))?.registered ?? 0 })),
    recentRegistrations,
    eventRegistrationStats,
  });
});

export default router;
