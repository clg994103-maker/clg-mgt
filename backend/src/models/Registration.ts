import mongoose, { Schema } from "mongoose";
import { randomBytes } from "node:crypto";

const registrationSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student" }, eventId: { type: Schema.Types.ObjectId, ref: "Event" },
  registrationCode: { type: String, unique: true, sparse: true, default: () => `REG-${randomBytes(6).toString("hex").toUpperCase()}` },
  registrationStatus: { type: String, default: "pending" }, checkInStatus: { type: String, default: "not_checked_in" },
  registeredAt: { type: Date, default: Date.now }, checkedInAt: Date,
});
registrationSchema.index({ studentId: 1, eventId: 1 }, { unique: true });

export default mongoose.models.Registration || mongoose.model("Registration", registrationSchema);