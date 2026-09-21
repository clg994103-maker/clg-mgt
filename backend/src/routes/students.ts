import { Router } from "express";
import Student from "../models/Student.js";
import { requireStudent } from "../middleware/student.js";

const router = Router();

router.get("/me", requireStudent, async (request, response) => {
  const student = await Student.findById(request.studentId).select("name registerNumber department year");
  if (!student) return response.status(404).json({ message: "Student not found" });
  response.json(student);
});

export default router;
