"use client";

import { FormEvent, useEffect, useState } from "react";
import { StudentShell } from "../../../components/student/StudentShell";
import { getCurrentStudent, studentProfileUpdate, StudentUser } from "../../../lib/studentApi";
import { firebaseProfileUpdate } from "../../../lib/firebaseAuth";

export default function StudentProfilePage() {
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void getCurrentStudent().then((currentStudent) => {
      setStudent(currentStudent);
      setName(currentStudent.name);
    }).catch(() => {
      window.location.href = `/student/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
    }).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      await firebaseProfileUpdate(name.trim());
      const updatedStudent = await studentProfileUpdate(name.trim());
      setStudent(updatedStudent);
      setMessage("Profile updated successfully.");
      setName(updatedStudent.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  const initials = student ? student.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NA" : "NA";

  return <StudentShell title="My Profile" subtitle="Update your student profile information and keep your Campus Events details current.">
    {loading ? <div className="student-state">Loading your profile...</div> : student ? <div className="profile-page">
      <aside className="profile-card profile-summary">
        <div className="avatar large">{initials}</div>
        <div>
          <h2>{student.name}</h2>
          <p>{student.email}</p>
        </div>
      </aside>
      <section className="profile-card">
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="full-name">Full name</label>
            <input id="full-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" value={student.email} readOnly />
          </div>
          {message && <div className="profile-status">{message}</div>}
          {error && <div className="profile-status error">{error}</div>}
          <div className="profile-actions">
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
            <button className="btn ghost" type="button" onClick={() => { setName(student.name); setError(""); setMessage(""); }}>Cancel</button>
          </div>
        </form>
      </section>
    </div> : <div className="student-state">Unable to load your profile.</div>}
  </StudentShell>;
}
