"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../../../lib/api";

type VerifiedRegistration = { registrationId: string; studentName: string; email: string; eventName: string; eventDate: string; venue: string; status: string };

function formatDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" }) : "-";
}

export default function VerifyRegistrationPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const [registration, setRegistration] = useState<VerifiedRegistration | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    params.then(({ registrationId }) => fetch(`${API_URL}/api/registrations/verify/${encodeURIComponent(registrationId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Invalid Registration");
        setRegistration(data.registration);
      })
      .catch(() => setInvalid(true)));
  }, [params]);

  return <main className="shell"><section className="content verification-page"><div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div>{registration ? <div className="verification-card"><div className="eyebrow">Campus Events</div><h1 className="display">Registration Verified</h1><div className="verification-grid"><span>Student Name<b>{registration.studentName}</b></span><span>Email<b>{registration.email}</b></span><span>Event Name<b>{registration.eventName}</b></span><span>Event Date<b>{formatDate(registration.eventDate)}</b></span><span>Venue<b>{registration.venue}</b></span><span>Registration ID<b>{registration.registrationId}</b></span><span>Registration Status<b>{registration.status}</b></span></div></div> : invalid ? <div className="verification-card"><h1 className="display">Invalid Registration</h1><p>This QR code is not valid or the registration no longer exists.</p></div> : <div className="verification-card"><p>Verifying registration...</p></div>}</section></main>;
}