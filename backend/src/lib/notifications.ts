import mongoose from "mongoose";
import Notification, { type NOTIFICATION_TYPES } from "../models/Notification.js";
import Registration from "../models/Registration.js";
import Student from "../models/Student.js";

type NotificationType = typeof NOTIFICATION_TYPES[number];
type NotificationInput = {
  studentId: mongoose.Types.ObjectId | string;
  title: string;
  message: string;
  type: NotificationType;
  eventId?: mongoose.Types.ObjectId | string;
  registrationId?: mongoose.Types.ObjectId | string;
  dedupeKey: string;
};

export async function createNotification(input: NotificationInput) {
  try {
    return await Notification.create(input);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return null;
    throw error;
  }
}

export async function notifyAllStudents(input: Omit<NotificationInput, "studentId">) {
  const students = await Student.find({ role: "student" }).select("_id").lean();
  await Promise.all(students.map((student) => createNotification({ ...input, studentId: String(student._id) })));
}

export async function notifyEventRegistrants(eventId: mongoose.Types.ObjectId | string, input: Omit<NotificationInput, "studentId" | "eventId">) {
  const registrations = await Registration.find({ eventId, registrationStatus: { $ne: "rejected" } }).select("studentId").lean();
  const studentIds = [...new Set(registrations.map((registration) => String(registration.studentId)).filter(Boolean))];
  const students = await Student.find({ _id: { $in: studentIds }, role: "student" }).select("_id").lean();
  await Promise.all(students.map((student) => createNotification({ ...input, studentId: String(student._id), eventId })));
}