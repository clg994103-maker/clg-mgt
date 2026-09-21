import { API_URL } from "./api";

export { API_URL } from "./api";

export const STUDENT_PROFILE_STORAGE_KEY = "campus_student_user";

export type StudentEvent = {
  _id: string; title: string; description: string; category: string; department: string; date: string;
  startTime: string; endTime: string; venue: string; coordinator: string; maxParticipants: number;
  registrationDeadline: string; poster?: string; image?: string; rules: string; status: string; registrationEnabled: boolean;
  registrationCount: number; availableSeats: number;
};

export type StudentRegistration = {
  _id: string; registrationCode?: string; registrationStatus: string; checkInStatus: string; registeredAt: string; checkedInAt?: string;
  studentId?: { name: string; email: string; registerNumber?: string; department?: string; year?: string };
  eventId: StudentEvent;
};

export type StudentUser = { id: string; name: string; email: string; authProvider: string; department?: string; year?: string; registerNumber?: string };
export type StudentNotification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  eventId?: string;
  registrationId?: string;
  isRead: boolean;
  createdAt: string;
};

export class StudentApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export function readStoredStudentProfile(): StudentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STUDENT_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudentUser>;
    if (!parsed.id || !parsed.name || !parsed.email || !parsed.authProvider) return null;
    return { id: parsed.id, name: parsed.name, email: parsed.email, authProvider: parsed.authProvider, department: parsed.department, year: parsed.year, registerNumber: parsed.registerNumber };
  } catch {
    return null;
  }
}

export function writeStoredStudentProfile(student: StudentUser | null) {
  if (typeof window === "undefined") return;
  if (!student) {
    window.sessionStorage.removeItem(STUDENT_PROFILE_STORAGE_KEY);
    return;
  }
  const safeProfile = { id: student.id, name: student.name, email: student.email, authProvider: student.authProvider };
  window.sessionStorage.setItem(STUDENT_PROFILE_STORAGE_KEY, JSON.stringify(safeProfile));
}

export async function getCurrentStudent() {
  const response = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new StudentApiError(data.message ?? "Student login required", response.status);
  const user = data.user as StudentUser;
  writeStoredStudentProfile(user);
  return user;
}

export async function studentAuth(path: "/api/auth/login" | "/api/auth/signup", body: Record<string, string>) {
  const response = await fetch(`${API_URL}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new StudentApiError(data.message ?? "Unable to connect to the server. Please try again.", response.status);
  const user = data.user as StudentUser;
  writeStoredStudentProfile(user);
  return user;
}

export async function studentProfileUpdate(name: string) {
  const response = await fetch(`${API_URL}/api/auth/profile`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new StudentApiError(data.message ?? "Unable to update profile.", response.status);
  const user = data.user as StudentUser;
  writeStoredStudentProfile(user);
  window.dispatchEvent(new Event("student-profile-updated"));
  return user;
}

export async function studentLogout() { await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" }); writeStoredStudentProfile(null); }

export async function passwordResetRequest(email: string) { return authRequest("/api/auth/password-reset/request", { email }); }
export async function passwordResetVerify(email: string, otp: string) { return authRequest("/api/auth/password-reset/verify", { email, otp }); }
export async function passwordReset(resetToken: string, password: string) { return authRequest("/api/auth/password-reset/reset", { resetToken, password }); }

async function authRequest(path: string, body: Record<string, string>) {
  const response = await fetch(`${API_URL}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new StudentApiError(data.message ?? "Unable to connect to the server. Please try again.", response.status);
  return data as { email?: string; developmentOtp?: string; resetToken?: string; message?: string };
}

export async function studentFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, credentials: "include", headers: { ...options.headers, "Content-Type": "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined" && window.location.pathname.startsWith("/student/events/")) window.location.href = `/student/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
    throw new StudentApiError(data.message ?? "Something went wrong", response.status);
  }
  return data;
}

export async function getStudentNotifications() {
  return studentFetch("/api/notifications") as Promise<{ notifications: StudentNotification[]; unreadCount: number }>;
}

