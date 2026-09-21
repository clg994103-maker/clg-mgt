"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentEvent, StudentRegistration, studentFetch } from "../../lib/studentApi";
import { StudentShell, formatStudentDate } from "../../components/student/StudentShell";

type StudentProfile = { name: string; registerNumber: string; department: string; year: string };

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [events, setEvents] = useState<StudentEvent[]>([]);
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([studentFetch("/api/students/me"), studentFetch("/api/events"), studentFetch("/api/registrations")]).then(([student, eventData, registrationData]) => { setProfile(student); setEvents(eventData); setRegistrations(registrationData); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard")); }, []);
  const upcomingEvents = useMemo(() => events.slice(0, 3), [events]);
  const upcomingRegistration = registrations.find((registration) => new Date(registration.eventId.date) >= new Date());
  return <StudentShell title={profile ? `Welcome back, ${profile.name.split(" ")[0]}.` : "Welcome back."} subtitle="Your campus events, registrations and check-in status at a glance.">
    {error ? <div className="admin-error">{error}</div> : <div className="student-dashboard">
      <div className="student-dashboard-actions"><button className="btn" onClick={() => { window.location.href = "/student/events"; }}>Browse events</button><button className="btn ghost" onClick={() => { window.location.href = "/student/registrations"; }}>My registrations</button></div>
      <div className="student-dashboard-grid">
        <section className="student-dashboard-card student-hero-card"><div className="eyebrow">Your workspace</div><h2>{profile?.department ?? "Student"} <span>· Year {profile?.year ?? "—"}</span></h2><p>{profile?.registerNumber ? `Register number ${profile.registerNumber}` : "Keep exploring events that move you forward."}</p><button className="text-button" onClick={() => { window.location.href = "/student/events"; }}>Find your next event →</button></section>
        <section className="student-dashboard-card"><div className="eyebrow">Your activity</div><div className="student-mini-stats"><div><strong>{registrations.length}</strong><span>My registrations</span></div><div><strong>{registrations.filter((item) => item.checkInStatus === "checked_in" || item.checkInStatus === "checked-in").length}</strong><span>Checked in</span></div></div></section>
      </div>
      {upcomingRegistration && <section className="student-dashboard-card upcoming-registration"><div><div className="eyebrow">Upcoming registered event</div><h2>{upcomingRegistration.eventId.title}</h2><p>{formatStudentDate(upcomingRegistration.eventId.date)} · {upcomingRegistration.eventId.venue}</p></div><div><span className={`status ${upcomingRegistration.registrationStatus === "approved" ? "approved" : "pending"}`}>{upcomingRegistration.registrationStatus}</span><small>Check-in: {upcomingRegistration.checkInStatus}</small></div><button className="btn ghost" onClick={() => { window.location.href = `/student/registrations/${upcomingRegistration._id}`; }}>View registration</button></section>}
      <section><div className="section-heading"><div><div className="eyebrow">Coming up</div><h2>Upcoming events</h2></div><button className="text-button" onClick={() => { window.location.href = "/student/events"; }}>View all</button></div>{upcomingEvents.length ? <div className="event-grid">{upcomingEvents.map((event) => <article className="event-card" key={event._id}><div className="event-art art-mint"><span className="tag">{event.category}</span><span className="date-stamp">{new Date(event.date).getDate()}<small>{new Date(event.date).toLocaleString(undefined, { month: "short" }).toUpperCase()}</small></span></div><div className="card-body"><h3>{event.title}</h3><p>{event.description}</p><div className="meta"><span>{event.venue}</span><b>{event.availableSeats} seats left</b></div></div></article>)}</div> : <div className="student-state">No upcoming events yet.</div>}</section>
    </div>}
  </StudentShell>;
}
