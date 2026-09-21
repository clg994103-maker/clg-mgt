import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import Student from "../models/Student.js";

export async function requireStudent(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.campus_student_session;
  const secret = process.env.STUDENT_JWT_SECRET;
  if (!token || !secret) return response.status(401).json({ message: "Student login required" });
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload !== "object" || typeof payload.sub !== "string" || !mongoose.Types.ObjectId.isValid(payload.sub)) return response.status(401).json({ message: "Invalid student session" });
    if (!await Student.exists({ _id: payload.sub, role: "student" })) return response.status(401).json({ message: "Student login required" });
    request.studentId = payload.sub;
    next();
  } catch {
    return response.status(401).json({ message: "Student login required" });
  }
}

declare global {
  namespace Express { interface Request { studentId?: string } }
}