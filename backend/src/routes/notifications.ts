import { Router } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { requireStudent } from "../middleware/student.js";

const router = Router();
router.use(requireStudent);

router.get("/", async (request, response) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ studentId: request.studentId }).sort({ createdAt: -1 }).limit(100).lean(),
    Notification.countDocuments({ studentId: request.studentId, isRead: false }),
  ]);
  response.json({ notifications, unreadCount });
});

router.patch("/read-all", async (request, response) => {
  await Notification.updateMany({ studentId: request.studentId, isRead: false }, { isRead: true });
  response.json({ success: true });
});

router.patch("/:id/read", async (request, response) => {
  if (!mongoose.Types.ObjectId.isValid(request.params.id)) return response.status(404).json({ message: "Notification not found" });
  const notification = await Notification.findOneAndUpdate({ _id: request.params.id, studentId: request.studentId }, { isRead: true }, { new: true }).lean();
  if (!notification) return response.status(404).json({ message: "Notification not found" });
  response.json(notification);
});

export default router;