"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

type DashboardData = {
  stats: { totalStudents: number; totalEvents: number; upcomingEvents: number; totalRegistrations: number; approvedRegistrations: number; pendingRegistrations: number; checkedInParticipants: number };
  upcomingEvents: Array<{ _id: string; title: string; date: string; venue: string; registrationCount?: number; maxParticipants: number }>;
  recentRegistrations: Array<{ _id: string; registeredAt: string; registrationStatus: string; studentId?: { name: string }; eventId?: { title: string } }>;
  eventRegistrationStats: Array<{ _id: string; title: string; registered: number; checkedIn: number; maxParticipants: number }>;
};

function date(value: string) { return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" }); }

export default function AdminDashboard({ apiKey, onCreate, onViewEvents, onViewParticipants }: { apiKey: string; onCreate: () => void; onViewEvents: () => void; onViewParticipants: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`${API_URL}/api/admin/dashboard`, { headers: { "x-admin-key": apiKey } }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Could not load dashboard"); return body; }).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard")); }, [apiKey]);
  if (error) return <div className="admin-error">{error}</div>;
  if (!data) return <div className="admin-empty">Loading dashboard...</div>;
  const cards = [["Total students", data.stats.totalStudents], ["Total events", data.stats.totalEvents], ["Upcoming events", data.stats.upcomingEvents], ["Total registrations", data.stats.totalRegistrations], ["Approved registrations", data.stats.approvedRegistrations], ["Pending registrations", data.stats.pendingRegistrations], ["Checked-in participants", data.stats.checkedInParticipants]];
  return <div className="dashboard-content">
    <div className="dashboard-actions"><button className="btn secondary" onClick={onCreate}>+ Create event</button><button className="btn ghost" onClick={onViewEvents}>View events</button><button className="btn ghost" onClick={onViewParticipants}>View participants</button><button className="btn ghost" onClick={() => { window.location.href = "/admin/check-in"; }}>Scan QR</button></div>
    <div className="dashboard-stat-grid">{cards.map(([label, value]) => <div className="dashboard-stat" key={label as string}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="dashboard-grid">
      <section className="dashboard-card"><div className="section-heading"><div><div className="eyebrow">Next up</div><h2>Upcoming events</h2></div><button className="text-button" onClick={onViewEvents}>View all</button></div>{data.upcomingEvents.length ? data.upcomingEvents.map((event) => <button className="dashboard-list-row" key={event._id} onClick={onViewEvents}><span><b>{event.title}</b><small>{date(event.date)} · {event.venue}</small></span><strong>{event.registrationCount ?? 0}/{event.maxParticipants}</strong></button>) : <p className="muted">No upcoming published events.</p>}</section>
      <section className="dashboard-card"><div className="section-heading"><div><div className="eyebrow">Latest activity</div><h2>Recent registrations</h2></div><button className="text-button" onClick={onViewParticipants}>View all</button></div>{data.recentRegistrations.map((registration) => <div className="dashboard-list-row" key={registration._id}><span><b>{registration.studentId?.name ?? "Student"}</b><small>{registration.eventId?.title ?? "Event"} · {date(registration.registeredAt)}</small></span><em className={`status ${registration.registrationStatus === "approved" ? "approved" : registration.registrationStatus === "pending" ? "pending" : "rejected"}`}>{registration.registrationStatus}</em></div>)}</section>
    </div>
    <div className="dashboard-grid">
      <section className="dashboard-card"><div className="section-heading"><div><div className="eyebrow">Capacity</div><h2>Event registration statistics</h2></div></div>{data.eventRegistrationStats.map((event) => <div className="bar-row" key={event._id}><div><span>{event.title}</span><b>{event.registered}/{event.maxParticipants}</b></div><div className="bar-track"><i style={{ width: `${Math.min(event.maxParticipants ? event.registered / event.maxParticipants * 100 : 0, 100)}%` }} /></div></div>)}</section>
      <section className="dashboard-card"><div className="section-heading"><div><div className="eyebrow">Venue pulse</div><h2>Check-in statistics</h2></div></div>{data.eventRegistrationStats.map((event) => <div className="bar-row" key={event._id}><div><span>{event.title}</span><b>{event.checkedIn} checked in</b></div><div className="bar-track"><i className="checkin-bar" style={{ width: `${Math.min(event.registered ? event.checkedIn / event.registered * 100 : 0, 100)}%` }} /></div></div>)}</section>
    </div>
  </div>;
}
