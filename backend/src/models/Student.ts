import mongoose, { Schema } from "mongoose";

const studentSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: String, registerNumber: String, department: String, year: String,
  passwordHash: { type: String, select: false },
  firebaseUid: { type: String, sparse: true, unique: true },
  authProvider: { type: String, enum: ["email", "google"], default: "email" },
  googleId: { type: String, sparse: true, unique: true },
  role: { type: String, default: "student" },
}, { timestamps: true, collection: "students" });

studentSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.Student || mongoose.model("Student", studentSchema);