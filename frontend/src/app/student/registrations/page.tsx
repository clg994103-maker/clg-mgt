"use client";

import { useEffect, useState } from "react";
import { StudentRegistration, studentFetch } from "../../../lib/studentApi";
import { StudentShell, formatStudentDate } from "../../../components/student/StudentShell";

export default function StudentRegistrationsPage() {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { studentFetch("/api/registrations").then(setRegistrations).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load registrations")).finally(() => setLoading(false)); }, []);
  return <StudentShell title="My registrations" subtitle="Your upcoming events, approvals and check-in status in one place.">{error && <div className="admin-error">{error}</div>}{loading ? <div className="student-state">Loading registrations...</div> : registrations.length === 0 ? <div className="student-state">You have not registered for any events yet.<button className="btn" onClick={() => { window.location.href = "/student/events"; }}>Browse events</button></div> : <div className="registration-list">{registrations.map((registration) => <div className="registration-row" key={registration._id}><span><b>{registration.eventId.title}</b><small>{formatStudentDate(registration.eventId.date)} · {registration.eventId.venue}</small></span><span><em className={`status ${registration.registrationStatus === "approved" ? "approved" : registration.registrationStatus === "rejected" ? "rejected" : "pending"}`}>{registration.registrationStatus}</em><small>Check-in: {registration.checkInStatus}</small></span><span><small>Registered {formatStudentDate(registration.registeredAt)}</small><button className="text-button" onClick={() => { window.location.href = `/student/event-pass/${registration._id}`; }}>View Event Pass</button></span></div>)}</div>}</StudentShell>;
}