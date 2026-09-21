"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { studentFetch } from "../../../lib/studentApi";
import { StudentShell } from "../../../components/student/StudentShell";

function tokenFromQr(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("token") ?? "";
  } catch {
    return value.trim();
  }
}

export default function StudentCheckInPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(true);

  async function checkIn(value: string) {
    const token = tokenFromQr(value);
    if (!token) {
      setError("This QR code does not contain a valid event check-in code.");
      return;
    }
    setError("");
    setMessage("Verifying your registration...");
    setScanning(false);
    try {
      const data = await studentFetch("/api/registrations/check-in", { method: "POST", body: JSON.stringify({ token }) });
      setMessage(data.message ?? "Checked in successfully.");
    } catch (reason) {
      setMessage("");
      setError(reason instanceof Error ? reason.message : "Could not complete check-in");
      setScanning(true);
    }
  }

  return <StudentShell title="Event check-in" subtitle="Scan the QR code displayed by the event administrator. Your registration and approval are verified securely.">
    <div className="check-in-layout">
      {scanning && <StudentQrScanner onDecoded={(decodedText) => { void checkIn(decodedText); }} onError={setError} />}
      {message && <div className="success-state"><b>{message}</b><button className="btn ghost" onClick={() => { window.location.href = "/student/registrations"; }}>View my registrations</button></div>}
      {error && <div className="admin-error">{error}<button className="btn ghost" onClick={() => { setError(""); setScanning(true); }}>Try scanning again</button></div>}
    </div>
  </StudentShell>;
}

function StudentQrScanner({ onDecoded, onError }: { onDecoded: (value: string) => void; onError: (message: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const decodedRef = useRef(onDecoded);
  const errorRef = useRef(onError);
  decodedRef.current = onDecoded;
  errorRef.current = onError;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const scanner = new Html5Qrcode(container.id);
    let disposed = false;
    void scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decodedText) => {
      if (!disposed) decodedRef.current(decodedText);
    }, () => undefined).catch(() => {
      if (!disposed) errorRef.current("Camera access is unavailable. Allow camera access or use a device with a camera.");
    });
    return () => {
      disposed = true;
      const stop = scanner.isScanning ? scanner.stop() : Promise.resolve();
      void stop.then(() => scanner.clear()).catch(() => undefined);
    };
  }, []);

  return <div id="event-check-in-reader" ref={containerRef} className="qr-reader" />;
}
