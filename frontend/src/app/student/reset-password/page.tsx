"use client";

import { FormEvent, useState } from "react";
import { StudentApiError, passwordReset } from "../../../lib/studentApi";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!confirmPassword) return setError("Confirmation is required.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    const resetToken = window.sessionStorage.getItem("student_reset_token") ?? "";
    setLoading(true);
    try {
      await passwordReset(resetToken, password);
      window.sessionStorage.removeItem("student_reset_email");
      window.sessionStorage.removeItem("student_development_otp");
      window.sessionStorage.removeItem("student_reset_token");
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof StudentApiError ? reason.message : "Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) return <main className="student-login"><div className="student-login-box"><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="eyebrow">Password updated</div><h1 className="display">Password reset successful.</h1><button className="btn" onClick={() => { window.location.href = "/student/login"; }}>Continue to login</button></div></main>;
  return <main className="student-login"><form className="student-login-box" onSubmit={submit}><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="eyebrow">Create new password</div><h1 className="display">Choose a new password.</h1><label className="field"><span>New password</span><div className="password-input-wrapper"><input className="admin-key-input" type={showPassword ? "text" : "password"} placeholder="Enter new password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-visibility" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>👁</button></div></label><label className="field"><span>Confirm new password</span><div className="password-input-wrapper"><input className="admin-key-input" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><button type="button" className="password-visibility" aria-label={showConfirmPassword ? "Hide password" : "Show password"} onClick={() => setShowConfirmPassword((visible) => !visible)}>👁</button></div></label>{error && <div className="admin-error">{error}</div>}<button className="btn" disabled={loading}>{loading ? "Resetting..." : "Reset password"}</button></form></main>;
}
