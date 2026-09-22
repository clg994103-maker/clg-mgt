import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { API_URL } from "./api";
import { StudentApiError, writeStoredStudentProfile, type StudentUser } from "./studentApi";

export function firebaseErrorMessage(reason: unknown) {
  const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-login-credentials": "Invalid email or password.",
    "auth/user-not-found": "No account was found with this email.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/user-disabled": "This account has been disabled. Contact an administrator.",
    "auth/too-many-requests": "Too many sign-in attempts. Please wait and try again later.",
    "auth/weak-password": "Password is too weak.",
    "auth/missing-email": "Enter your email address.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Please allow popups for Google sign-in.",
    "auth/network-request-failed": "Network error. Please check your connection.",
  };
  return messages[code] ?? (reason instanceof Error ? reason.message : "Unable to connect to Firebase. Please try again.");
}

export async function syncFirebaseUser(user: User, name?: string) {
  const idToken = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/auth/firebase-sync`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ name: name ?? user.displayName ?? user.email?.split("@")[0] ?? "Student" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new StudentApiError(data.message ?? "Could not synchronize your student account.", response.status);
  const student = data.user as StudentUser;
  writeStoredStudentProfile(student);
  return student;
}

export async function firebaseSignup(name: string, email: string, password: string) {
  const normalizedEmail = email.trim();
  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  await updateProfile(result.user, { displayName: name.trim() });
  return syncFirebaseUser(result.user, name.trim());
}

export async function firebaseLogin(email: string, password: string) {
  const normalizedEmail = email.trim();
  const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  return syncFirebaseUser(result.user);
}

export async function firebaseGoogleLogin() {
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return syncFirebaseUser(result.user);
}

export async function firebasePasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function firebaseProfileUpdate(name: string) {
  if (!auth.currentUser) throw new StudentApiError("Student login required", 401);
  await updateProfile(auth.currentUser, { displayName: name.trim() });
}

export async function firebaseLogout() {
  await signOut(auth);
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
  writeStoredStudentProfile(null);
}