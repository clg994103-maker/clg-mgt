import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import Student from "../models/Student.js";
import { requireStudent } from "../middleware/student.js";
import { verifyFirebaseIdToken } from "../lib/firebaseAdmin.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sessionCookie = "campus_student_session";
const developmentResetRequests = new Map<string, { otp: string; expiresAt: number; verified: boolean }>();

function getSecret() {
  const secret = process.env.STUDENT_JWT_SECRET;
  if (!secret) throw new Error("STUDENT_JWT_SECRET is not configured");
  return secret;
}

function publicStudent(student: { _id: unknown; name: string; email: string; authProvider?: string }) {
  return { id: String(student._id), name: student.name, email: student.email, authProvider: student.authProvider ?? "email", department: (student as typeof student & { department?: string }).department ?? "", year: (student as typeof student & { year?: string }).year ?? "", registerNumber: (student as typeof student & { registerNumber?: string }).registerNumber ?? "" };
}

function createSession(response: Parameters<NonNullable<Parameters<typeof router.post>[1]>>[1], student: { _id: unknown }) {
  const token = jwt.sign({ sub: String(student._id), role: "student" }, getSecret(), { expiresIn: "7d" });
  response.cookie(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000, path: "/" });
}

router.get("/me", requireStudent, async (request, response) => {
  const student = await Student.findById(request.studentId).select("name email authProvider department year registerNumber");
  if (!student) return response.status(401).json({ message: "Student login required" });
  response.json({ user: publicStudent(student) });
});

router.post("/firebase-sync", async (request, response) => {
  const authorization = request.headers.authorization ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!idToken) return response.status(401).json({ message: "Firebase authentication is required." });
  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email) return response.status(401).json({ message: "A Firebase email is required." });
    const provider = decoded.firebase?.sign_in_provider === "google.com" ? "google" : "email";
    const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
    let student = await Student.findOne({ firebaseUid: decoded.uid });
    if (!student) student = await Student.findOne({ email, role: "student" });
    if (student) {
      student.firebaseUid = decoded.uid;
      student.email = email;
      student.name = name || student.name || decoded.name || email.split("@")[0];
      student.authProvider = provider;
      await student.save();
    } else {
      student = await Student.create({ firebaseUid: decoded.uid, name: name || decoded.name || email.split("@")[0], email, authProvider: provider, role: "student" });
    }
    createSession(response, student);
    response.json({ success: true, user: publicStudent(student) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firebase authentication failed.";
    if (message.startsWith("Firebase Admin is not configured")) return response.status(503).json({ message: "Firebase Admin is not configured on the backend." });
    response.status(401).json({ message: "Firebase authentication failed." });
  }
});

router.post("/signup", async (request, response) => {
  const name = typeof request.body.name === "string" ? request.body.name.trim() : "";
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  if (!name || !email || !password) return response.status(400).json({ message: "Name, email and password are required." });
  if (!emailPattern.test(email)) return response.status(400).json({ message: "Enter a valid email address." });
  if (password.length < 8) return response.status(400).json({ message: "Password must be at least 8 characters." });
  if (await Student.exists({ email })) return response.status(409).json({ message: "An account with this email already exists." });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const student = await Student.create({ name, email, passwordHash, authProvider: "email", role: "student" });
    createSession(response, student);
    response.status(201).json({ user: publicStudent(student) });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) return response.status(409).json({ message: "An account with this email already exists." });
    throw error;
  }
});

router.post("/login", async (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  if (!email || !password) return response.status(400).json({ message: "Email and password are required." });
  if (!emailPattern.test(email)) return response.status(400).json({ message: "Enter a valid email address." });
  const student = await Student.findOne({ email, role: "student" }).select("+passwordHash name email authProvider");
  if (!student) return response.status(401).json({ message: "Invalid email or password." });
  if (student.authProvider === "google" && !student.passwordHash) return response.status(401).json({ message: "This account uses Google sign-in." });
  if (!student.passwordHash || !(await bcrypt.compare(password, student.passwordHash))) return response.status(401).json({ message: "Invalid email or password." });
  createSession(response, student);
  const safeStudent = publicStudent(student);
  response.json({ success: true, message: "Login successful", student: safeStudent, user: safeStudent });
});

router.patch("/profile", requireStudent, async (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  if (!name) return response.status(400).json({ message: "Full name is required." });
  const student = await Student.findByIdAndUpdate(request.studentId, { name }, { new: true }).select("name email authProvider department year registerNumber");
  if (!student) return response.status(404).json({ message: "Student not found." });
  response.json({ user: publicStudent(student) });
});

router.post("/logout", (_request, response) => {
  response.clearCookie(sessionCookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  response.json({ success: true });
});

router.post("/password-reset/request", async (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) return response.status(400).json({ message: "Please enter a valid Gmail address." });
  const student = await Student.exists({ email, role: "student" });
  if (!student) return response.status(404).json({ message: "No account found with this email. Please sign up." });
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  developmentResetRequests.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000, verified: false });
  response.json({ email, developmentOtp: otp });
});

router.post("/password-reset/verify", (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const otp = typeof request.body.otp === "string" ? request.body.otp.trim() : "";
  const resetRequest = developmentResetRequests.get(email);
  if (!resetRequest || resetRequest.expiresAt < Date.now() || resetRequest.otp !== otp) return response.status(400).json({ message: "Invalid OTP. Please try again." });
  resetRequest.verified = true;
  const resetToken = `${email}:${resetRequest.otp}`;
  response.json({ resetToken });
});

router.post("/password-reset/reset", async (request, response) => {
  const resetToken = typeof request.body.resetToken === "string" ? request.body.resetToken : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const separator = resetToken.lastIndexOf(":");
  const email = separator > 0 ? resetToken.slice(0, separator) : "";
  const resetRequest = developmentResetRequests.get(email);
  if (!resetRequest || !resetRequest.verified || resetRequest.expiresAt < Date.now() || resetToken !== `${email}:${resetRequest.otp}`) return response.status(400).json({ message: "Password reset session expired. Please request a new OTP." });
  if (password.length < 8) return response.status(400).json({ message: "Password must be at least 8 characters." });
  const passwordHash = await bcrypt.hash(password, 12);
  const student = await Student.findOneAndUpdate({ email, role: "student" }, { passwordHash, authProvider: "email" }, { new: true }).select("name email authProvider");
  if (!student) return response.status(404).json({ message: "No account found with this email. Please sign up." });
  developmentResetRequests.delete(email);
  response.json({ message: "Password reset successful." });
});

router.get("/google", (request, response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !clientSecret || !callbackUrl) return response.status(503).json({ message: "Google sign-in is not configured." });
  const requestedPath = typeof request.query.returnTo === "string" && request.query.returnTo.startsWith("/") ? request.query.returnTo : "/student";
  const client = new OAuth2Client(clientId, clientSecret, callbackUrl);
  const authorizationUrl = client.generateAuthUrl({ access_type: "offline", scope: ["openid", "email", "profile"], state: Buffer.from(requestedPath).toString("base64url"), prompt: "select_account" });
  response.redirect(authorizationUrl);
});

router.get("/google/callback", async (request, response) => {
  const frontendUrl = "http://localhost:3000";
  const returnTo = typeof request.query.state === "string" ? Buffer.from(request.query.state, "base64url").toString("utf8") : "/student";
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/student";
  if (request.query.error) return response.redirect(`${frontendUrl}/student/login?error=google-failed`);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (!clientId || !clientSecret || !callbackUrl || typeof request.query.code !== "string") return response.redirect(`${frontendUrl}/student/login?error=google-failed`);
  try {
    const client = new OAuth2Client(clientId, clientSecret, callbackUrl);
    const { tokens } = await client.getToken(request.query.code);
    if (!tokens.id_token) return response.redirect(`${frontendUrl}/student/login?error=google-failed`);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) return response.redirect(`${frontendUrl}/student/login?error=google-failed`);
    let student = await Student.findOne({ email: profile.email.toLowerCase() });
    if (student && student.authProvider !== "google") return response.redirect(`${frontendUrl}/student/login?error=google-account-conflict`);
    student ??= await Student.create({ name: profile.name ?? profile.email.split("@")[0], email: profile.email.toLowerCase(), authProvider: "google", googleId: profile.sub, role: "student" });
    createSession(response, student);
    response.redirect(`${frontendUrl}${safeReturnTo}`);
  } catch {
    response.redirect(`${frontendUrl}/student/login?error=google-failed`);
  }
});

export default router;