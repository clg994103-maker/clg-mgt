"use client";

import { FormEvent, useEffect, useState } from "react";
import { StudentApiError, passwordResetRequest, passwordResetVerify } from "../../../../lib/studentApi";

export default function VerifyPasswordResetPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [developmentOtp, setDevelopmentOtp] = useState("");
  useEffect(() => { setEmail(window.sessionStorage.getItem("student_reset_email") ?? ""); setDevelopmentOtp(window.sessionStorage.getItem("student_development_otp") ?? ""); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp)) return setError("Invalid OTP. Please try again.");
    setLoading(true);
    try {
      const result = await passwordResetVerify(email, otp);
      window.sessionStorage.setItem("student_reset_token", result.resetToken ?? "");
      window.location.href = "/student/reset-password";
    } catch (reason) {
      setError(reason instanceof StudentApiError ? reason.message : "Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError("");
    try {
      const result = await passwordResetRequest(email);
      window.sessionStorage.setItem("student_development_otp", result.developmentOtp ?? "");
      setDevelopmentOtp(result.developmentOtp ?? "");
      setOtp("");
    } catch (reason) {
      setError(reason instanceof StudentApiError ? reason.message : "Unable to connect to the server. Please try again.");
    }
  }

  return <main className="student-login"><form className="student-login-box" onSubmit={submit}><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="eyebrow">Verify your email</div><h1 className="display">Enter the 6-digit OTP.</h1>{developmentOtp && <div className="development-otp">Development OTP: <b>{developmentOtp}</b></div>}<label className="field"><span>6 digit OTP</span><input className="admin-key-input" inputMode="numeric" maxLength={6} placeholder="6 digit OTP" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label>{error && <div className="admin-error">{error}</div>}<button className="btn" disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</button><button type="button" className="text-button" onClick={() => void resend()}>Resend OTP</button></form></main>;
}
