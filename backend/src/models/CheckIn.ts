import mongoose, { Schema } from "mongoose";

const checkInSchema = new Schema({
  registrationId: { type: Schema.Types.ObjectId, ref: "Registration", required: true, unique: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  eventTitle: { type: String, required: true },
  checkedInAt: { type: Date, required: true, default: Date.now },
  checkedInBy: { type: String, required: true, default: "admin" },
  status: { type: String, enum: ["checked-in"], default: "checked-in" },
}, { timestamps: true, collection: "checkin" });

export default mongoose.models.CheckIn || mongoose.model("CheckIn", checkInSchema);