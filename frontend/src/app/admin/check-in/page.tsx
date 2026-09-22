"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { API_URL } from "../../../lib/api";

type EventOption = { _id: string; title: string; date: string; venue: string };
type StudentSummary = { name?: string; registerNumber?: string; department?: string; year?: string; email?: string };
type EventSummary = { _id?: string; title?: string; date?: string; venue?: string };
type Registration = { _id: string; registrationCode?: string; registrationStatus: string; checkInStatus: string; checkedInAt?: string; studentId?: StudentSummary; eventId?: EventSummary };
type CheckInRecord = { _id: string; registrationId: string; studentName: string; studentEmail: string; eventTitle: string; checkedInAt: string; checkedInBy: string; status: string };

const ADMIN_KEY = "campus_admin_key";

function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
function formatDateTime(value?: string) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-"; }
function registrationCodeFromQr(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("registrationCode") ?? url.searchParams.get("code") ?? url.pathname.split("/").pop() ?? "";
  } catch { return value.trim(); }
}

export default function AdminCheckInPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [apiKey, setApiKey] = useState("");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadHistory(key: string) {
    const response = await fetch(`${API_URL}/api/admin/check-in`, { headers: { "x-admin-key": key } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "Could not load recent check-ins");
    setCheckIns(data as CheckInRecord[]);
  }

  useEffect(() => {
    const key = window.localStorage.getItem(ADMIN_KEY) ?? "";
    setApiKey(key);
    if (!key) return;
    Promise.all([
      fetch(`${API_URL}/api/admin/events`, { headers: { "x-admin-key": key } }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not load events"); return data as EventOption[]; }),
      loadHistory(key),
    ]).then(([loadedEvents]) => setEvents(loadedEvents)).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load check-in data"));
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, [loading, scanning]);

  useEffect(() => {
    if (!scanning) return undefined;
    const scanner = new Html5Qrcode("admin-check-in-reader");
    scannerRef.current = scanner;
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decodedText) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setScanning(false);
      void checkIn(decodedText);
    }, () => undefined).catch(() => { setScanning(false); setError("Camera access is unavailable. Use the registration input instead."); });
    return () => { if (scanner.isScanning) void scanner.stop().catch(() => undefined); scannerRef.current = null; };
  }, [scanning]);

  async function checkIn(value: string) {
    const code = registrationCodeFromQr(value);
    if (!code) { setError("Enter a registration ID."); processingRef.current = false; inputRef.current?.focus(); return; }
    setLoading(true); setRegistration(null); setMessage(""); setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/check-in`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": apiKey }, body: JSON.stringify({ registrationCode: code, ...(eventId ? { eventId } : {}) }) });
      const data = await response.json();
      if (data.registration) setRegistration(data.registration);
      if (!response.ok) throw new Error(data.message ?? "Invalid registration ID");
      setMessage(data.message ?? "Student checked in successfully.");
      setRegistrationCode("");
      await loadHistory(apiKey);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not check in student"); }
    finally { setLoading(false); processingRef.current = false; inputRef.current?.focus(); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void checkIn(registrationCode); }
  function startScanning() { setRegistration(null); setMessage(""); setError(""); setScanning(true); }

  if (!apiKey) return <main className="admin-login"><div className="admin-login-box"><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="eyebrow">Restricted workspace</div><h1 className="display">Admin access required</h1><p>Sign in from the admin workspace before opening check-in.</p><button className="btn" onClick={() => { window.location.href = "/admin"; }}>Go to admin login</button></div></main>;

  return <main className="admin-layout"><aside className="sidebar"><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="side-label">Workspace</div><nav><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Overview</button><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Events</button><button className="side-link" onClick={() => { window.location.href = "/admin/participants"; }}>Participants</button><button className="side-link active">Check-in</button></nav><div className="side-label">Account</div><button className="side-link" onClick={() => { window.localStorage.removeItem(ADMIN_KEY); window.location.href = "/admin"; }}>Sign out</button></aside><section className="admin-main"><div className="admin-top"><div><div className="eyebrow">Admin workspace</div><h1 className="display">Check-in</h1><p>Scan or enter a student's registration ID to check them in to an event.</p></div></div><div className="check-in-layout"><form onSubmit={submit}><label className="field"><span>Registration ID</span><input ref={inputRef} className="admin-key-input" value={registrationCode} onChange={(event) => setRegistrationCode(event.target.value)} placeholder="Scan or enter registration ID" autoComplete="off" /></label><label className="field"><span>Checking in for</span><select value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">Any event</option>{events.map((event) => <option key={event._id} value={event._id}>{event.title} · {formatDate(event.date)}</option>)}</select></label><button className="btn secondary" type="submit" disabled={loading}>{loading ? "Checking in..." : "Check in"}</button></form>{!scanning && <button className="btn ghost" onClick={startScanning}>Start QR Scanner</button>}{scanning && <div id="admin-check-in-reader" className="qr-reader" />}{message && registration && <div className="check-in-result success-state"><b>✓ {message}</b><div className="detail-grid"><span>Student name<b>{registration.studentId?.name ?? "-"}</b></span><span>Email<b>{registration.studentId?.email ?? "-"}</b></span><span>Event<b>{registration.eventId?.title ?? "-"}</b></span><span>Registration ID<b>{registration.registrationCode ?? "-"}</b></span><span>Checked in<b>{formatDateTime(registration.checkedInAt)}</b></span></div></div>}{error && <div className="admin-error">{error}</div>}<div className="section-heading"><div><div className="eyebrow">History</div><h2>Recent check-ins</h2></div></div>{checkIns.length === 0 ? <div className="admin-empty">No check-ins yet.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Student</th><th>Email</th><th>Event</th><th>Registration</th><th>Time</th><th>Checked in by</th><th>Status</th></tr></thead><tbody>{checkIns.map((checkIn) => <tr key={checkIn._id}><td>{checkIn.studentName}</td><td>{checkIn.studentEmail}</td><td>{checkIn.eventTitle}</td><td>{checkIn.registrationId}</td><td>{formatDateTime(checkIn.checkedInAt)}</td><td>{checkIn.checkedInBy}</td><td>{checkIn.status}</td></tr>)}</tbody></table></div>}</div></section></main>;
+}
