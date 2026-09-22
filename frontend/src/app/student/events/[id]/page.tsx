"use client";

import { useEffect, useState } from "react";
import { StudentEvent, studentFetch } from "../../../../lib/studentApi";
import { StudentShell, formatStudentDate } from "../../../../components/student/StudentShell";
import { getEventImageUrl } from "../../../../lib/eventImage";
import { auth, authReady } from "../../../../firebase/config";
import { loginRedirect } from "../../../../lib/authRedirect";

export default function StudentEventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [event, setEvent] = useState<StudentEvent | null>(null); const [loading, setLoading] = useState(true); const [authLoading, setAuthLoading] = useState(true); const [message, setMessage] = useState(""); const [success, setSuccess] = useState(false); const [registering, setRegistering] = useState(false); const [posterFailed, setPosterFailed] = useState(false);
  useEffect(() => { params.then(({ id }) => studentFetch(`/api/events/${id}`).then(setEvent).catch((reason) => setMessage(reason instanceof Error ? reason.message : "Event not found")).finally(() => setLoading(false))); }, [params]);
  useEffect(() => {
    let active = true;
    void authReady.then(async () => {
      if (!active) return;
      setAuthLoading(false);
      if (!auth.currentUser || !event) return;
      try {
        const registrations = await studentFetch("/api/registrations") as { eventId?: { _id?: string }; registrationStatus?: string }[];
        if (active && registrations.some((registration) => registration.eventId?._id === event._id && registration.registrationStatus !== "rejected")) setSuccess(true);
        const search = new URLSearchParams(window.location.search);
        if (active && search.get("action") === "register" && !registrations.some((registration) => registration.eventId?._id === event._id && registration.registrationStatus !== "rejected")) await register();
      } catch { /* A logged-in user may still be syncing with the backend. */ }
    });
    return () => { active = false; };
  }, [event]);
  async function register() { if (!event || registering) return; setMessage(""); await authReady; const user = auth.currentUser; if (!user) { window.location.href = loginRedirect(window.location.pathname, "register"); return; } setRegistering(true); try { await studentFetch("/api/registrations", { method: "POST", body: JSON.stringify({ eventId: event._id }) }); setSuccess(true); setEvent({ ...event, availableSeats: Math.max(event.availableSeats - 1, 0), registrationCount: event.registrationCount + 1 }); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Registration failed"); } finally { setRegistering(false); } }
  const registrationClosed = !event?.registrationEnabled || event?.availableSeats < 1 || (event ? new Date() > new Date(event.registrationDeadline) : false);
  const posterUrl = getEventImageUrl(event?.poster ?? event?.image ?? "");

  return <StudentShell publicPage title="Event details" subtitle="Everything you need before you decide to join.">{loading ? <div className="student-state">Loading event details...</div> : !event ? <div className="student-state">{message || "Event not found."}</div> : <div className="detail-layout">{posterUrl && !posterFailed ? <img className="student-poster" src={posterUrl} alt={`${event.title} poster`} onError={() => setPosterFailed(true)} /> : <div className="student-poster poster-placeholder">No event poster</div>}<div className="student-detail-copy"><div className="eyebrow">{event.category} · {event.department}</div><h2 className="display">{event.title}</h2><p>{event.description}</p><div className="student-info-grid"><span>Date <b>{formatStudentDate(event.date)}</b></span><span>Time <b>{event.startTime} - {event.endTime}</b></span><span>Venue <b>{event.venue}</b></span><span>Coordinator <b>{event.coordinator}</b></span><span>Seats <b>{event.availableSeats} remaining</b></span><span>Deadline <b>{formatStudentDate(event.registrationDeadline)}</b></span></div>{event.rules && <><div className="eyebrow detail-label">Rules</div><p>{event.rules}</p></>}{message && <div className="admin-error">{message}</div>}{success ? <div className="success-state"><b>Registration successful.</b><span>Your place is reserved. View it from My registrations.</span><button className="btn" onClick={() => { window.location.href = "/student/registrations"; }}>View my registration</button></div> : <button className="btn" disabled={authLoading || registering || registrationClosed} onClick={() => void register()}>{authLoading || registering ? "Checking registration..." : !event.registrationEnabled ? "Registration disabled" : event.availableSeats < 1 ? "Event full" : new Date() > new Date(event.registrationDeadline) ? "Registration closed" : "Register for event"}</button>}</div></div>}</StudentShell>;
}