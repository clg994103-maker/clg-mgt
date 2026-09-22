"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ParticipantPanel from "../../components/admin/ParticipantPanel";
import EventCheckInQr from "../../components/admin/EventCheckInQr";
import AdminDashboard from "../../components/admin/AdminDashboard";
import { API_URL } from "../../lib/api";

const DEMO_ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? "campus-admin-demo-key";
const DEMO_ADMIN = { email: "admin@campus.events", password: "admin123" };
const statuses = ["Draft", "Published", "Registration Closed", "Completed", "Cancelled"] as const;
const categories = ["Workshop", "Competition", "Hackathon", "Cultural", "Sports", "Seminar"];
const departments = ["All departments", "Computer Science", "Electronics", "Management", "Humanities", "Mechanical"];

type EventRecord = {
  _id: string; title: string; description: string; category: string; department: string; date: string;
  startTime: string; endTime: string; venue: string; coordinator: string; maxParticipants: number;
  registrationDeadline: string; poster: string; rules: string; status: typeof statuses[number]; registrationEnabled: boolean; registrationCount: number;
};

type EventForm = Omit<EventRecord, "_id" | "registrationCount">;
const emptyForm: EventForm = { title: "", description: "", category: "Workshop", department: "Computer Science", date: "", startTime: "09:00", endTime: "10:00", venue: "", coordinator: "", maxParticipants: 50, registrationDeadline: "", poster: "", rules: "", status: "Draft", registrationEnabled: true };

function Brand() { return <div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div>; }
function dateInput(value: string) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }
function getLegacyParticipantEvent(): EventRecord | null { return null; }

export default function AdminPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const participantEvent = getLegacyParticipantEvent();
  function setParticipantEvent(event: EventRecord | null | ((current: EventRecord | null) => EventRecord | null)) { if (typeof event === "function") return; if (event) window.location.href = `/admin/participants?eventId=${encodeURIComponent(event._id)}`; }
  const [apiKey, setApiKey] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [department, setDepartment] = useState("All departments");
  const [status, setStatus] = useState("All statuses");
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [details, setDetails] = useState<EventRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLElement | null>(null);

  useEffect(() => { setApiKey(window.localStorage.getItem("campus_admin_key") ?? ""); }, []);
  useEffect(() => { if (apiKey) { window.localStorage.setItem("campus_admin_key", apiKey); void loadEvents(); } else setLoading(false); }, [apiKey, query, category, department, status]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => { if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) setMobileMenuOpen(false); };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("mousedown", handlePointerDown); document.removeEventListener("keydown", handleKeyDown); };
  }, [mobileMenuOpen]);

  async function loadEvents() {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (query) params.set("search", query); if (category !== "All categories") params.set("category", category); if (department !== "All departments") params.set("department", department); if (status !== "All statuses") params.set("status", status);
    try { const response = await fetch(`${API_URL}/api/admin/events?${params}`, { headers: { "x-admin-key": apiKey } }); const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not load events"); setEvents(data); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load events"); } finally { setLoading(false); }
  }

  function openCreate() { setEditingId(null); setForm(emptyForm); setError(""); setShowForm(true); }
  function openEdit(event: EventRecord) { setEditingId(event._id); setForm({ ...event, date: dateInput(event.date), registrationDeadline: dateInput(event.registrationDeadline) }); setError(""); setShowForm(true); }
  function updateField(field: keyof EventForm, value: string | number | boolean) { setForm((current) => ({ ...current, [field]: value })); }

  const [selectedPosterFile, setSelectedPosterFile] = useState<File | null>(null);

  function handlePosterUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, PNG, and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size is too large. Please upload an image below 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedPosterFile(file);
    const reader = new FileReader();
    reader.onload = () => updateField("poster", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!form.title.trim() || !form.description.trim() || !form.venue.trim() || !form.coordinator.trim() || !form.date || !form.registrationDeadline) return setError("Complete all required fields.");
    if (form.endTime <= form.startTime) return setError("End time must be after start time.");
    if (form.registrationDeadline > form.date) return setError("Registration deadline must be on or before the event date.");

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `${API_URL}/api/admin/events/${editingId}` : `${API_URL}/api/events`;
    const formData = new FormData();
    Object.entries({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      department: form.department,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      venue: form.venue.trim(),
      coordinator: form.coordinator.trim(),
      maxParticipants: String(form.maxParticipants),
      registrationDeadline: form.registrationDeadline,
      rules: form.rules,
      status: editingId ? form.status : "Published",
      allowStudentRegistrations: String(form.registrationEnabled),
      registrationEnabled: String(form.registrationEnabled),
    }).forEach(([key, value]) => formData.append(key, value));

    if (selectedPosterFile) {
      formData.append("posterFile", selectedPosterFile);
    } else if (form.poster) {
      formData.append("poster", form.poster);
    }

    try {
      const response = await fetch(url, { method, headers: { "x-admin-key": apiKey }, body: formData });
      const data = await response.json().catch(() => ({}));
      if (response.status === 413) {
        throw new Error("Image is too large. Please choose a smaller image.");
      }
      if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).join(" ") : data.message ?? "Could not save event");
      setSelectedPosterFile(null);
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      setError("");
      if (!editingId) {
        setTimeout(() => {
          setError("");
        }, 2500);
      }
      await loadEvents();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save event");
    }
  }

  async function deleteEvent(event: EventRecord) { if (!window.confirm(`Delete “${event.title}”? This also removes its registrations.`)) return; const response = await fetch(`${API_URL}/api/admin/events/${event._id}`, { method: "DELETE", headers: { "x-admin-key": apiKey } }); if (!response.ok) { setError("Could not delete event"); return; } await loadEvents(); }
  async function toggleRegistration(event: EventRecord) { if (event.registrationEnabled && !window.confirm(`Disable registration for “${event.title}”? Students will no longer be able to register.`)) return; const response = await fetch(`${API_URL}/api/admin/events/${event._id}/registration`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": apiKey }, body: JSON.stringify({ registrationEnabled: !event.registrationEnabled }) }); if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.message ?? "Could not update registration state"); return; } await loadEvents(); }

  const totalRegistrations = useMemo(() => events.reduce((total, event) => total + event.registrationCount, 0), [events]);
  const [loginEmail, setLoginEmail] = useState(DEMO_ADMIN.email);
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  function handleAdminLogin() {
    if (loginEmail.trim().toLowerCase() === DEMO_ADMIN.email && loginPassword === DEMO_ADMIN.password) {
      setApiKey(DEMO_ADMIN_KEY);
      setLoginError("");
      return;
    }
    setLoginError("Invalid email or password.");
  }

  if (!apiKey) return <main className="admin-login"><div className="admin-login-box"><Brand /><div className="eyebrow">Restricted workspace</div><h1 className="display">Admin access</h1><p>Sign in with your campus admin account.</p><input className="admin-key-input" type="email" placeholder="Email address" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleAdminLogin(); }} /><div className="password-input-wrapper"><input className="admin-key-input" type={showLoginPassword ? "text" : "password"} placeholder="Password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleAdminLogin(); }} /><button type="button" className="password-visibility" aria-label={showLoginPassword ? "Hide password" : "Show password"} onClick={() => setShowLoginPassword((visible) => !visible)}>👁</button></div>{loginError && <div className="admin-error">{loginError}</div>}<button className="btn" onClick={handleAdminLogin}>Continue</button><button className="btn ghost" onClick={() => { window.location.href = "/"; }}>Back to student view</button></div></main>;

  return <main className="admin-layout"><aside className="sidebar"><Brand /><div className="side-label">Workspace</div><nav><button className={`side-link ${showDashboard ? "active" : ""}`} onClick={() => setShowDashboard(true)}>Overview</button><button className={`side-link ${!showDashboard ? "active" : ""}`} onClick={() => setShowDashboard(false)}>Events</button><button className="side-link" onClick={() => setShowDashboard(false)}>Registrations</button><button className="side-link" onClick={() => { window.location.href = "/admin/check-in"; }}>Check-in</button></nav><div className="side-label">Account</div><button className="side-link" onClick={() => { window.localStorage.removeItem("campus_admin_key"); setApiKey(""); setLoginPassword(""); }}>Sign out</button>  </aside><section className={`admin-main ${showDashboard ? "dashboard-mode" : ""}`}><div className="admin-top"><div>  <div className="eyebrow">Admin workspace</div><h1 className="display">{showDashboard ? "Campus overview" : "Event management"}</h1><p>{showDashboard ? "A live pulse of registrations, events and venue activity." : "Create, review and control every campus event."}</p></div><button className="btn secondary" onClick={openCreate}>+ Create event</button>  </div>{showDashboard ?   <AdminDashboard apiKey={apiKey} onCreate={openCreate} onViewEvents={() => setShowDashboard(false)} onViewParticipants={() => { setShowDashboard(false); if (events[0]) setParticipantEvent(events[0]); }} /> : null}{error && <div className="admin-error">{error}</div>}<div className="stats"><div className="stat"><strong>{events.length}</strong><span>Events shown</span></div><div className="stat"><strong>{totalRegistrations}</strong><span>Registrations shown</span></div><div className="stat"><strong>{events.filter((event) => event.status === "Published").length}</strong><span>Published events</span></div></div><div className="admin-filters"><input className="search" placeholder="Search title or coordinator..." value={query} onChange={(event) => setQuery(event.target.value)} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div><div className="table-wrap">{loading ? <div className="admin-empty">Loading events...</div> : events.length === 0 ? <div className="admin-empty">No events match these filters.</div> : <table className="data-table"><thead><tr><th>Event</th><th>Category</th><th>Department</th><th>Date</th><th>Registrations</th><th>Status</th><th>Actions</th></tr></thead><tbody>{events.map((event) => <tr key={event._id}><td><b>{event.title}</b><br /><span className="muted">{event.venue}</span></td><td>{event.category}</td><td>{event.department}</td><td>{formatDate(event.date)}</td><td>{event.registrationCount} / {event.maxParticipants}</td><td><span className={`status ${event.status === "Published" ? "approved" : event.status === "Cancelled" ? "pending" : "neutral"}`}>{event.status}</span></td><td><div className="row-actions"><button className="text-button" onClick={() => setDetails(event)}>View</button><button className="text-button" onClick={() => setParticipantEvent(event)}>Participants</button><button className="text-button" onClick={() => openEdit(event)}>Edit</button><button className="text-button" onClick={() => void toggleRegistration(event)}>{event.registrationEnabled ? "Disable" : "Enable"}</button><button className="text-button danger" onClick={() => void deleteEvent(event)}>Delete</button></div></td></tr>)}</tbody></table>}</div></section>{details && <div className="modal-backdrop" onClick={() => setDetails(null)}><div className="modal detail-modal" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">{details.category} · {details.status}</div><h2>{details.title}</h2></div><button className="close" onClick={() => setDetails(null)}>×</button></div>{details.poster && <img className="poster-preview" src={details.poster} alt="Event poster" />}<p>{details.description}</p><div className="detail-grid"><span>Date <b>{formatDate(details.date)}</b></span><span>Time <b>{details.startTime} - {details.endTime}</b></span><span>Venue <b>{details.venue}</b></span><span>Coordinator <b>{details.coordinator}</b></span><span>Department <b>{details.department}</b></span><span>Deadline <b>{formatDate(details.registrationDeadline)}</b></span>  <span>Registrations <b>{details.registrationCount} / {details.maxParticipants}</b></span><span>Registration <b>{details.registrationEnabled ? "Enabled" : "Disabled"}</b></span></div><EventCheckInQr eventId={details._id} apiKey={apiKey} />{details.rules && <><div className="eyebrow detail-label">Rules</div><p>{details.rules}</p></>}</div></div>  }{participantEvent && <ParticipantPanel eventId={participantEvent._id} eventTitle={participantEvent.title} registrationCount={participantEvent.registrationCount} maxParticipants={participantEvent.maxParticipants} apiKey={apiKey} onClose={() => setParticipantEvent(null)} onCountChange={(count) => { setParticipantEvent((current) => current ? { ...current, registrationCount: count } : current); setEvents((current) => current.map((item) => item._id === participantEvent._id ? { ...item, registrationCount: count } : item)); }} />}{showForm && <div className="modal-backdrop"><form className="modal event-form" onSubmit={saveEvent}><div className="modal-head"><div><div className="eyebrow">{editingId ? "Update listing" : "New listing"}</div><h2>{editingId ? "Edit event" : "Create event"}</h2></div><button type="button" className="close" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><Field label="Event title" required><input value={form.title} onChange={(event) => updateField("title", event.target.value)} /></Field><Field label="Category" required><select value={form.category} onChange={(event) => updateField("category", event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Department" required><select value={form.department} onChange={(event) => updateField("department", event.target.value)}>{departments.slice(1).map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Venue" required><input value={form.venue} onChange={(event) => updateField("venue", event.target.value)} /></Field><Field label="Date" required><input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} /></Field><Field label="Coordinator" required><input value={form.coordinator} onChange={(event) => updateField("coordinator", event.target.value)} /></Field><Field label="Start time" required><input type="time" value={form.startTime} onChange={(event) => updateField("startTime", event.target.value)} /></Field><Field label="End time" required><input type="time" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} /></Field><Field label="Maximum participants" required><input type="number" min="1" value={form.maxParticipants} onChange={(event) => updateField("maxParticipants", Number(event.target.value))} /></Field><Field label="Registration deadline" required><input type="date" value={form.registrationDeadline} onChange={(event) => updateField("registrationDeadline", event.target.value)} /></Field><Field label="Status" required><select value={form.status} onChange={(event) => updateField("status", event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Poster URL"><input type="url" value={form.poster} onChange={(event) => updateField("poster", event.target.value)} placeholder="https://..." /></Field><Field label="Upload image" full><div className="image-upload-box"><input type="file" accept="image/*" onChange={handlePosterUpload} className="upload-input" />{form.poster ? <img src={form.poster} alt="Event poster preview" className="poster-upload-preview" /> : <div className="poster-upload-placeholder">Choose an image</div>}</div></Field><Field label="Upload image" full><div className="image-upload-box"><input type="file" accept="image/*" onChange={handlePosterUpload} className="upload-input" />{form.poster ? <img src={form.poster} alt="Event poster preview" className="poster-upload-preview" /> : <div className="poster-upload-placeholder">Choose an image</div>}</div></Field><Field label="Description" full required><textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} /></Field><Field label="Rules" full><textarea value={form.rules} onChange={(event) => updateField("rules", event.target.value)} /></Field><label className="checkbox-field"><input type="checkbox" checked={form.registrationEnabled} onChange={(event) => updateField("registrationEnabled", event.target.checked)} /> Allow student registrations</label></div>{error && <div className="admin-error">{error}</div>}<div className="modal-actions"><button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="btn" type="submit">{editingId ? "Save changes" : "Create event"}</button></div></form></div>}</main>;
}

function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) { return <div className={`field ${full ? "full" : ""}`}><label>{label}{required && " *"}</label>{children}</div>; }