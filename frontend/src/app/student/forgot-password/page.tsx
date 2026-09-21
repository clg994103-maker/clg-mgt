"use client";

import { FormEvent, useState } from "react";
import { firebaseErrorMessage, firebasePasswordReset } from "../../../lib/firebaseAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    setLoading(true);
    try {
      await firebasePasswordReset(email.trim());
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (reason) {
      setError(firebaseErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return <main className="student-login"><form className="student-login-box" onSubmit={submit}><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="eyebrow">Reset your password</div><h1 className="display">Forgot your password?</h1><p>Enter your email address to continue.</p><label className="field"><span>Email</span><input className="admin-key-input" type="email" placeholder="Enter your email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{message && <div className="profile-status">{message}</div>}{error && <div className="admin-error">{error}</div>}<button className="btn" disabled={loading}>{loading ? "Sending..." : "Send reset email"}</button><button type="button" className="btn ghost" onClick={() => { window.location.href = "/student/login"; }}>Back to login</button></form></main>;
}
