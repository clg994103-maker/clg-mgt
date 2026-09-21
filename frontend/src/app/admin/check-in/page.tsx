"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { API_URL } from "../../../lib/api";

type EventOption = { _id: string; title: string; date: string; venue: string };
type Registration = {
  _id: string;
  registrationCode?: string;
  registrationStatus: string;
  checkInStatus: string;
  checkedInAt?: string;
  studentId?: { name?: string; registerNumber?: string; department?: string; year?: string; email?: string };
  eventId?: { _id?: string; title?: string; date?: string; venue?: string };
};

const ADMIN_KEY = "campus_admin_key";

function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
function formatDateTime(value?: string) { return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-"; }
function registrationCodeFromQr(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("registrationCode") ?? url.searchParams.get("code") ?? url.pathname.split("/").pop() ?? "";
  } catch {
    return value.trim();
  }
}

export default function AdminCheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [apiKey, setApiKey] = useState("");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const key = window.localStorage.getItem(ADMIN_KEY) ?? "";
    setApiKey(key);
    if (!key) return;
    fetch(`${API_URL}/api/admin/events`, { headers: { "x-admin-key": key } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not load events"); return data as EventOption[]; })
      .then(setEvents)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load events"));
  }, []);

  useEffect(() => {
    if (!scanning) return undefined;
    const scanner = new Html5Qrcode("admin-check-in-reader");
    scannerRef.current = scanner;
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decodedText) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setScanning(false);
      void checkIn(decodedText);
    }, () => undefined).catch(() => {
      setScanning(false);
      setError("Camera access is unavailable. Allow camera access or use a device with a camera.");
    });
    return () => {
      if (scanner.isScanning) void scanner.stop().catch(() => undefined);
      scannerRef.current = null;
    };
  }, [scanning]);

  async function checkIn(value: string) {
    setLoading(true); setRegistration(null); setMessage(""); setError("");
    try {
      const registrationCode = registrationCodeFromQr(value);
      const response = await fetch(`${API_URL}/api/admin/check-in`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": apiKey }, body: JSON.stringify({ registrationCode, ...(eventId ? { eventId } : {}) }) });
      const data = await response.json();
      if (data.registration) setRegistration(data.registration);
      if (!response.ok) throw new Error(data.message ?? "Invalid event pass");
      setMessage(data.message ?? "CHECK-IN SUCCESSFUL");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid event pass");
    } finally {
      setLoading(false); processingRef.current = false;
    }
  }

  function startScanning() { setRegistration(null); setMessage(""); setError(""); setScanning(true); }

  if (!apiKey) return <main className="admin-login"><div className="admin-login-box"><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="eyebrow">Restricted workspace</div><h1 className="display">Admin access required</h1><p>Sign in from the admin workspace before opening check-in.</p><button className="btn" onClick={() => { window.location.href = "/admin"; }}>Go to admin login</button></div></main>;

  return <main className="admin-layout"><aside className="sidebar"><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="side-label">Workspace</div><nav><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Overview</button><button className="side-link" onClick={() => { window.location.href = "/admin"; }}>Events</button><button className="side-link" onClick={() => { window.location.href = "/admin/participants"; }}>Participants</button><button className="side-link active">Check-in</button></nav><div className="side-label">Account</div><button className="side-link" onClick={() => { window.localStorage.removeItem(ADMIN_KEY); window.location.href = "/admin"; }}>Sign out</button><button className="side-link" onClick={() => { window.location.href = "/"; }}>← Student view</button></aside><section className="admin-main"><div className="admin-top"><div><div className="eyebrow">Admin workspace</div><h1 className="display">Check-in</h1><p>Scan an event pass and verify the registration at the venue.</p></div></div><div className="check-in-layout"><label className="field"><span>Checking in for</span><select value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">Any event</option>{events.map((event) => <option key={event._id} value={event._id}>{event.title} · {formatDate(event.date)}</option>)}</select></label>{scanning && <div id="admin-check-in-reader" className="qr-reader" />}{!scanning && !loading && <button className="btn secondary" onClick={startScanning}>Start QR Scanner</button>}{loading && <div className="admin-empty">Verifying event pass...</div>}{message && registration && <div className="check-in-result success-state"><b>{message}</b><div className="detail-grid"><span>Student name<b>{registration.studentId?.name ?? "-"}</b></span><span>Register number<b>{registration.studentId?.registerNumber ?? "-"}</b></span><span>Department<b>{registration.studentId?.department ?? "-"}</b></span><span>Year<b>{registration.studentId?.year ?? "-"}</b></span><span>Email<b>{registration.studentId?.email ?? "-"}</b></span><span>Event name<b>{registration.eventId?.title ?? "-"}</b></span><span>Date<b>{formatDate(registration.eventId?.date)}</b></span><span>Venue<b>{registration.eventId?.venue ?? "-"}</b></span><span>Registration status<b>{registration.registrationStatus}</b></span><span>Check-in status<b>Checked in at {formatDateTime(registration.checkedInAt)}</b></span></div></div>}{error && <div className="admin-error">{error}{registration?.checkedInAt && <div>Checked in at {formatDateTime(registration.checkedInAt)}</div>}</div>}</div></section></main>;
}