"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { StudentRegistration, studentFetch } from "../../../../lib/studentApi";
import { StudentShell, formatStudentDate } from "../../../../components/student/StudentShell";
import { getEventImageUrl } from "../../../../lib/eventImage";

export default function StudentEventPassPage({ params }: { params: Promise<{ id: string }> }) {
  const [registration, setRegistration] = useState<StudentRegistration | null>(null);
  const [error, setError] = useState("");
  const passRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    params.then(({ id }) => studentFetch(`/api/registrations/${id}`).then(setRegistration).catch((reason) => setError(reason instanceof Error ? reason.message : "Event pass not found")));
  }, [params]);

  function downloadPass() {
    const svg = passRef.current?.querySelector("svg");
    const pass = passRef.current;
    if (!svg || !registration || !pass) return;
    const source = new XMLSerializer().serializeToString(svg);
    const passMarkup = pass.innerHTML.replace(svg.outerHTML, source);
    const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>Campus Events Pass</title><style>body{font-family:Arial,sans-serif;background:#f7faf6;color:#17221d;padding:24px}main{max-width:680px;margin:auto;background:#fff;border:1px solid #dfe8e1;padding:30px}img{max-width:100%;max-height:230px;object-fit:cover}svg{display:block;margin:24px auto;width:220px;height:220px}span{display:block;margin:8px 0}b{display:block;margin-top:4px}</style></head><body><main>${passMarkup}</main></body></html>`], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${registration.registrationCode ?? registration._id}-event-pass.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <StudentShell title="Event pass" subtitle="Keep this digital pass ready when you arrive at the venue.">{error ? <div className="student-state">{error}</div> : !registration ? <div className="student-state">Loading your event pass...</div> : <div className="event-pass-page"><div className="event-pass" ref={passRef}><div className="event-pass-head"><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div><div className="eyebrow">Event pass</div></div>{(registration.eventId.poster || registration.eventId.image) && <img className="event-pass-image" src={getEventImageUrl(registration.eventId.poster ?? registration.eventId.image)} alt={`${registration.eventId.title} poster`} />}<h2 className="display">{registration.eventId.title}</h2><div className="event-pass-event-info"><span>Date <b>{formatStudentDate(registration.eventId.date)}</b></span><span>Time <b>{registration.eventId.startTime} - {registration.eventId.endTime}</b></span><span>Venue <b>{registration.eventId.venue}</b></span></div><div className="event-pass-student"><div className="eyebrow">Student</div><strong>{registration.studentId?.name ?? "Student"}</strong><span>{registration.studentId?.email ?? ""}</span><div className="event-pass-student-grid"><span>Register number <b>{registration.studentId?.registerNumber || "-"}</b></span><span>Department <b>{registration.studentId?.department || "-"}</b></span><span>Year <b>{registration.studentId?.year || "-"}</b></span><span>Registration ID <b>{registration.registrationCode ?? registration._id}</b></span></div></div><div className="event-pass-qr"><QRCodeSVG value={`${window.location.origin}/verify-registration/${encodeURIComponent(registration.registrationCode ?? registration._id)}`} size={220} level="M" includeMargin /><span>Scan or show this registration pass</span></div><span className={`status ${registration.registrationStatus === "approved" ? "approved" : registration.registrationStatus === "rejected" ? "rejected" : "pending"}`}>{registration.registrationStatus}</span></div><div className="event-pass-actions"><button className="btn" onClick={() => window.print()}>Print Pass</button><button className="btn secondary" onClick={downloadPass}>Download Pass</button><button className="btn ghost" onClick={() => { window.location.href = "/student/registrations"; }}>Back to My Registrations</button></div></div>}</StudentShell>;
}
