import mongoose, { Schema } from "mongoose";

export const EVENT_STATUSES = ["Draft", "Published", "Registration Closed", "Completed", "Cancelled"] as const;

const eventSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  venue: { type: String, required: true, trim: true },
  coordinator: { type: String, required: true, trim: true },
  maxParticipants: { type: Number, required: true, min: 1 },
  registrationDeadline: { type: Date, required: true },
  poster: { type: String, trim: true, default: "" },
  image: { type: String, trim: true, default: "" },
  rules: { type: String, trim: true, default: "" },
  status: { type: String, enum: EVENT_STATUSES, default: "Draft" },
  registrationEnabled: { type: Boolean, default: true },
  allowStudentRegistrations: { type: Boolean, default: true },
  checkInToken: { type: String, unique: true, sparse: true, select: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Event || mongoose.model("Event", eventSchema);