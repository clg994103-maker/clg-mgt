"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { API_URL } from "../../lib/api";


export default function EventCheckInQr({ eventId, apiKey }: { eventId: string; apiKey: string }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function showQr() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/events/${eventId}/check-in-qr`, { headers: { "x-admin-key": apiKey } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not generate check-in QR");
      const origin = typeof window === "undefined" ? "" : window.location.origin;
      setValue(`${origin}/student/check-in?token=${encodeURIComponent(data.token)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not generate check-in QR");
    } finally {
      setLoading(false);
    }
  }

  return <div className="event-qr-panel">
    <div className="eyebrow">Venue check-in</div>
    {!value ? <button className="btn secondary" onClick={() => void showQr()} disabled={loading}>{loading ? "Generating..." : "Display check-in QR"}</button> : <div className="event-qr-display"><QRCodeSVG value={value} size={240} level="M" /><p>Display this QR code at the venue. Students scan it from My registrations.</p><button className="btn ghost" onClick={() => setValue("")}>Generate again</button></div>}
    {error && <div className="admin-error">{error}</div>}
  </div>;
}
