import mongoose, { Schema } from "mongoose";

export const NOTIFICATION_TYPES = [
  "event_published",
  "registration_successful",
  "event_updated",
  "event_cancelled",
  "event_reminder",
  "check_in_confirmation",
] as const;

const notificationSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event" },
  registrationId: { type: Schema.Types.ObjectId, ref: "Registration" },
  dedupeKey: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ studentId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema, "notifications");