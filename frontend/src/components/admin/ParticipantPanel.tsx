"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

const participantStatuses = ["All statuses", "pending", "approved", "rejected"] as const;
type ParticipantStatus = Exclude<typeof participantStatuses[number], "All statuses">;

type Participant = {
  _id: string;
  registrationStatus: ParticipantStatus;
  checkInStatus: string;
  registeredAt: string;
  studentId: { name: string; registerNumber: string; department: string; year: string; email: string; phone: string };
};

type ParticipantPanelProps = {
  eventId: string;
  eventTitle: string;
  registrationCount: number;
  maxParticipants: number;
  apiKey: string;
  onClose: () => void;
  onCountChange: (count: number) => void;
};
type ParticipantSummary = { totalRegistered: number; totalCheckedIn: number; remainingParticipants: number };

function formatDate(value: string) { return new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }); }

export default function ParticipantPanel({ eventId, eventTitle, registrationCount, maxParticipants, apiKey, onClose, onCountChange }: ParticipantPanelProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof participantStatuses)[number]>("All statuses");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ParticipantSummary>({ totalRegistered: registrationCount, totalCheckedIn: 0, remainingParticipants: Math.max(maxParticipants - registrationCount, 0) });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ eventId });
    if (query) params.set("search", query);
    if (status !== "All statuses") params.set("status", status);
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/admin/registrations?${params}`, { headers: { "x-admin-key": apiKey }, signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not load participants"); return data; })
      .then((data: { participants: Participant[] } & ParticipantSummary) => { setParticipants(data.participants); setSummary({ totalRegistered: data.totalRegistered, totalCheckedIn: data.totalCheckedIn, remainingParticipants: data.remainingParticipants }); })
      .catch((reason) => { if (reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Could not load participants"); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [apiKey, eventId, query, status]);

  async function updateStatus(participant: Participant, nextStatus: ParticipantStatus) {
    if (nextStatus === "rejected" && !window.confirm(`Reject ${participant.studentId.name}'s registration?`)) return;
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/registrations/${participant._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": apiKey }, body: JSON.stringify({ registrationStatus: nextStatus }) });
      const data = await response.json() as { registration?: Participant; registrationCount?: number; message?: string };
      if (!response.ok || !data.registration) throw new Error(data.message ?? "Could not update registration");
      setParticipants((current) => current.map((item) => item._id === participant._id ? data.registration! : item));
      setSelected(data.registration);
      if (typeof data.registrationCount === "number") { onCountChange(data.registrationCount); setSummary((current) => ({ ...current, totalRegistered: data.registrationCount!, remainingParticipants: Math.max(maxParticipants - data.registrationCount!, 0) })); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update registration"); }
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="modal participant-modal" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">Participants · {registrationCount} / {maxParticipants}</div><h2>{eventTitle}</h2></div><button className="close" onClick={onClose} aria-label="Close participants">×</button>  </div><div className="participant-summary"><div><strong>{summary.totalRegistered}</strong><span>Total registered</span></div><div><strong>{summary.totalCheckedIn}</strong><span>Checked in</span></div><div><strong>{summary.remainingParticipants}</strong><span>Remaining</span></div></div><div className="participant-toolbar"><input className="search" placeholder="Search name, register number or email..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search participants" /><select value={status} onChange={(event) => setStatus(event.target.value as (typeof participantStatuses)[number])} aria-label="Filter registration status">{participantStatuses.map((item) => <option key={item}>{item}</option>)}</select></div>{error && <div className="admin-error">{error}</div>}{loading ? <div className="admin-empty">Loading participants...</div> : participants.length === 0 ? <div className="admin-empty">No participants match these filters.</div> : <div className="table-wrap participant-table-wrap"><table className="data-table participant-table"><thead><tr><th>Student name</th><th>Register number</th><th>Department</th><th>Year</th><th>Email</th><th>Phone</th><th>Registration status</th><th>Check-in status</th><th>Registered date</th><th>Actions</th></tr></thead><tbody>{participants.map((participant) => <tr key={participant._id}><td><button className="text-button" onClick={() => setSelected(participant)}>{participant.studentId.name}</button></td><td>{participant.studentId.registerNumber}</td><td>{participant.studentId.department}</td><td>{participant.studentId.year}</td><td>{participant.studentId.email}</td><td>{participant.studentId.phone}</td><td><span className={`status ${participant.registrationStatus === "approved" ? "approved" : participant.registrationStatus === "rejected" ? "rejected" : "pending"}`}>{participant.registrationStatus}</span></td><td>{participant.checkInStatus}</td><td>{formatDate(participant.registeredAt)}</td><td><div className="row-actions"><button className="text-button" disabled={participant.registrationStatus === "approved"} onClick={() => void updateStatus(participant, "approved")}>Approve</button><button className="text-button danger" disabled={participant.registrationStatus === "rejected"} onClick={() => void updateStatus(participant, "rejected")}>Reject</button></div></td></tr>)}</tbody></table></div>}{selected && <div className="participant-detail"><div className="modal-head"><div><div className="eyebrow">Student details</div><h3>{selected.studentId.name}</h3></div><button className="close" onClick={() => setSelected(null)} aria-label="Close student details">×</button></div><div className="detail-grid"><span>Register number <b>{selected.studentId.registerNumber}</b></span><span>Department <b>{selected.studentId.department}</b></span><span>Year <b>{selected.studentId.year}</b></span><span>Email <b>{selected.studentId.email}</b></span><span>Phone <b>{selected.studentId.phone}</b></span><span>Registered <b>{formatDate(selected.registeredAt)}</b></span><span>Registration <b>{selected.registrationStatus}</b></span><span>Check-in <b>{selected.checkInStatus}</b></span></div></div>}</div></div>;
}
