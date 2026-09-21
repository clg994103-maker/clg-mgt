"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../../../lib/api";

type EventOption = { _id: string; title: string; maxParticipants: number };
type Participant = {
  _id: string;
  registrationStatus: "pending" | "approved" | "rejected";
  checkInStatus: string;
  registeredAt: string;
  checkedInAt?: string;
  studentId?: { name?: string; registerNumber?: string; department?: string; year?: string; email?: string; phone?: string };
  eventId?: { _id?: string; title?: string };
};
type ParticipantResponse = { participants: Participant[]; totalRegistered: number; totalCheckedIn: number; remainingParticipants: number };

function formatDate(value: string) { return new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }); }
function isCheckedIn(value: string) { return value === "checked_in" || value === "checked-in"; }

export default function AdminParticipantsPage() {
  const [apiKey, setApiKey] = useState("");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [summary, setSummary] = useState({ totalRegistered: 0, totalCheckedIn: 0, remainingParticipants: 0 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const key = window.localStorage.getItem("campus_admin_key") ?? "";
    setApiKey(key);
    const initialEventId = new URLSearchParams(window.location.search).get("eventId") ?? "";
    setEventId(initialEventId);
  }, []);

  useEffect(() => {
    if (!apiKey) { setLoading(false); return; }
    fetch(`${API_URL}/api/admin/events`, { headers: { "x-admin-key": apiKey } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not load events"); return data as EventOption[]; })
      .then(setEvents)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load events"));
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (query) params.set("search", query);
    if (status !== "All statuses") params.set("status", status);
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/admin/registrations?${params}`, { headers: { "x-admin-key": apiKey }, signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not load participants"); return data as ParticipantResponse; })
      .then((data) => { setParticipants(data.participants); setSummary({ totalRegistered: data.totalRegistered, totalCheckedIn: data.totalCheckedIn, remainingParticipants: data.remainingParticipants }); })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Could not load participants"); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [apiKey, eventId, query, status]);

  async function updateStatus(participant: Participant, nextStatus: "approved" | "rejected") {
    if (nextStatus === "rejected" && !window.confirm(`Reject ${participant.studentId?.name ?? "this student's"} registration?`)) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/registrations/${participant._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": apiKey }, body: JSON.stringify({ registrationStatus: nextStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not update registration");
      setParticipants((current) => current.map((item) => item._id === participant._id ? data.registration : item));
      setSelected(data.registration);
      setSummary((current) => ({ ...current, totalRegistered: data.registrationCount ?? current.totalRegistered, remainingParticipants: Math.max(current.remainingParticipants + (nextStatus === "rejected" ? 1 : -1), 0) }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update registration"); }
  }

  if (!apiKey) return <main className="admin-login"><div className="admin-login-box"><Brand /><div className="eyebrow">Restricted workspace</div><h1 className="display">Admin access required</h1><p>Sign in from the admin workspace before opening participants.</p><button className="btn" onClick={() => { window.location.href = "/admin"; }}>Go to admin login</button></div></main>;

  return <main className="admin-layout"><aside className="sidebar"><Brand /><div className="side-label">Workspace</div><nav><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Overview</button><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Events</button><button className="side-link active">Participants</button><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Registrations</button><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Check-in</button></nav><div className="side-label">Account</div><button className="side-link" onClick={() => { window.localStorage.removeItem("campus_admin_key"); window.location.href = "/admin"; }}>Sign out</button><button className="side-link" onClick={() => { window.location.href = "/"; }}>← Student view</button></aside><section className="admin-main"><div className="admin-top"><div><div className="eyebrow">Admin workspace</div><h1 className="display">Participants</h1><p>View and manage students registered for campus events.</p></div><button className="btn secondary" onClick={() => { window.location.href = "/admin?create=1"; }}>+ Create event</button></div><div className="participant-summary"><div><strong>{summary.totalRegistered}</strong><span>Total registered</span></div><div><strong>{summary.totalCheckedIn}</strong><span>Checked in</span></div><div><strong>{summary.remainingParticipants}</strong><span>Remaining</span></div></div><div className="participant-toolbar"><input className="search" placeholder="Search name, register number or email..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search participants" /><select value={eventId} onChange={(event) => setEventId(event.target.value)} aria-label="Filter by event"><option value="">All events</option>{events.map((event) => <option value={event._id} key={event._id}>{event.title}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter registration status"><option>All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>{error && <div className="admin-error">{error}</div>}{loading ? <div className="admin-empty">Loading participants...</div> : participants.length === 0 ? <div className="admin-empty">No participants match these filters.</div> : <div className="table-wrap participant-table-wrap"><table className="data-table participant-table"><thead><tr><th>Student name</th><th>Register number</th><th>Department</th><th>Year</th><th>Email</th><th>Event</th><th>Status</th><th>Check-in</th><th>Actions</th></tr></thead><tbody>{participants.map((participant) => <tr key={participant._id}><td><button className="text-button" onClick={() => setSelected(participant)}>{participant.studentId?.name ?? "Student"}</button></td><td>{participant.studentId?.registerNumber ?? "-"}</td><td>{participant.studentId?.department ?? "-"}</td><td>{participant.studentId?.year ?? "-"}</td><td>{participant.studentId?.email ?? "-"}</td><td>{participant.eventId?.title ?? "-"}</td><td><span className={`status ${participant.registrationStatus === "approved" ? "approved" : participant.registrationStatus === "rejected" ? "rejected" : "pending"}`}>{participant.registrationStatus}</span></td><td>{isCheckedIn(participant.checkInStatus) ? `Checked in${participant.checkedInAt ? ` · ${formatDate(participant.checkedInAt)}` : ""}` : "Not checked in"}</td><td><div className="row-actions"><button className="text-button" disabled={participant.registrationStatus === "approved"} onClick={() => void updateStatus(participant, "approved")}>Approve</button><button className="text-button danger" disabled={participant.registrationStatus === "rejected"} onClick={() => void updateStatus(participant, "rejected")}>Reject</button></div></td></tr>)}</tbody></table></div>}{selected && <aside className="participant-detail"><div className="modal-head"><div><div className="eyebrow">Student details</div><h3>{selected.studentId?.name ?? "Student"}</h3></div><button className="close" onClick={() => setSelected(null)} aria-label="Close student details">×</button></div><div className="detail-grid"><span>Email <b>{selected.studentId?.email ?? "-"}</b></span><span>Register number <b>{selected.studentId?.registerNumber ?? "-"}</b></span><span>Department <b>{selected.studentId?.department ?? "-"}</b></span><span>Year <b>{selected.studentId?.year ?? "-"}</b></span><span>Event <b>{selected.eventId?.title ?? "-"}</b></span><span>Registration date <b>{formatDate(selected.registeredAt)}</b></span><span>Registration status <b>{selected.registrationStatus}</b></span><span>Check-in status <b>{isCheckedIn(selected.checkInStatus) ? `Checked in${selected.checkedInAt ? ` at ${formatDate(selected.checkedInAt)}` : ""}` : "Not checked in"}</b></span></div></aside>}</section></main>;
}

function Brand() { return <div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div>; }
