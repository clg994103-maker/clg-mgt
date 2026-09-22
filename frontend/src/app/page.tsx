"use client";

import { useEffect, useMemo, useState } from "react";
import { getEventImageUrl } from "../lib/eventImage";
import { apiFetch } from "../lib/api";
import { loginRedirect } from "../lib/authRedirect";
import { studentFetch } from "../lib/studentApi";
import { useStudentSession } from "../lib/useStudentSession";


type PublicEvent = {
  _id: string;
  title: string;
  category: string;
  department: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  description: string;
  rules?: string;
  poster?: string;
  image?: string;
  maxParticipants?: number;
  registrationCount?: number;
  availableSeats?: number;
  registrationEnabled?: boolean;
};

type EventItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  month: string;
  description: string;
  venue: string;
  seats: number;
  color: string;
  image?: string;
};

function Brand() { return <div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div>; }

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [category, setCategory] = useState("All events");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [registered, setRegistered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { student, loading: sessionLoading } = useStudentSession();

  useEffect(() => {
    let isActive = true;

    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const response = await apiFetch("/api/events");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Could not load events");
        }

        const mapped: EventItem[] = (Array.isArray(data) ? data : []).map((event: PublicEvent) => {
          const parsedDate = event.date ? new Date(event.date) : new Date();
          const month = parsedDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
          const day = parsedDate.toLocaleDateString("en-US", { day: "2-digit" });
          const seats = typeof event.availableSeats === "number"
            ? event.availableSeats
            : Math.max((event.maxParticipants ?? 0) - (event.registrationCount ?? 0), 0);

          return {
            id: event._id,
            title: event.title,
            category: event.category || "Workshop",
            date: day,
            month,
            description: event.description,
            venue: event.venue,
            seats,
            color: "",
            image: event.image || event.poster || "",
          };
        });

        if (isActive) setEvents(mapped);
      } catch (loadError) {
        if (isActive) setError(loadError instanceof Error ? loadError.message : "Could not load events");
      } finally {
        if (isActive) setLoading(false);
      }
    }

    void loadEvents();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!student) { setRegistered([]); return; }
    void studentFetch("/api/registrations").then((registrations: { eventId?: { _id?: string }; registrationStatus?: string }[]) => {
      setRegistered(registrations.filter((registration) => registration.registrationStatus !== "rejected").map((registration) => registration.eventId?._id).filter((id): id is string => Boolean(id)));
    }).catch(() => setRegistered([]));
  }, [sessionLoading, student]);

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesCategory = category === "All events" ? true : event.category === category;
      const matchesQuery = event.title.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [events, category, query]);

  async function registerEvent(id: string) {
    if (sessionLoading || registering || registered.includes(id)) return;
    if (!student) { window.location.href = loginRedirect(`/student/events/${id}`, "register"); return; }
    setRegistering(id); setError("");
    try {
      await studentFetch("/api/registrations", { method: "POST", body: JSON.stringify({ eventId: id }) });
      setRegistered((current) => current.includes(id) ? current : [...current, id]);
      setEvents((current) => current.map((event) => event.id === id ? { ...event, seats: Math.max(event.seats - 1, 0) } : event));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed");
    } finally { setRegistering(null); }
  };

  return <main className="shell">
    <header className="nav">
      <Brand />
      <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}><span /><span /><span /></button>
      <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
        <button className="active" onClick={() => { setMenuOpen(false); window.location.href = "/student/events"; }}>Explore</button>
        {student && <button onClick={() => { setMenuOpen(false); window.location.href = "/student/registrations"; }}>My registrations <span>({registered.length})</span></button>}
        {!student && !sessionLoading && <button className="mobile-auth-link" onClick={() => { setMenuOpen(false); window.location.href = "/student/login"; }}>Login / Sign up</button>}
      </nav>
      {student ? <button className="profile profile-trigger" type="button" aria-label="Open student profile" onClick={() => { window.location.href = "/student/profile"; }}><span className="avatar">{student.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span className="profile-name">{student.name}</span></button> : !sessionLoading ? <button className="nav-auth-button" type="button" onClick={() => { window.location.href = "/student/login"; }}>Login / Sign up</button> : null}
    </header>

    <section className="content">
      <div className="hero">
        <div>
          <div className="eyebrow">Campus board</div>
          <h1 className="display">Make time for<br /><em>what’s next.</em></h1>
          <p className="hero-copy">Find the talks, workshops and moments that make campus feel like more than a place to study.</p>
        </div>
        <div className="stats">
          <div className="stat"><strong>{events.length}</strong><span>events live</span></div>
          <div className="stat"><strong>{registered.length}</strong><span>your registrations</span></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="filters">
          {["All events", "Workshop", "Competition", "Hackathon", "Cultural", "Sports", "Seminar"].map((item) => (
            <button key={item} className={`filter ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <input className="search" placeholder="Search events..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      {loading ? (
        <div className="empty">Loading events...</div>
      ) : error ? (
        <div className="empty">{error}</div>
      ) : (
        <div className="event-grid">
          {visibleEvents.length ? (
            visibleEvents.map((event) => (
              <article className="event-card" key={event.id}>
                <div
                  className={`event-art ${event.color}`}
                  style={event.image ? {
                    backgroundImage: `linear-gradient(135deg, rgba(14,24,22,0.2), rgba(14,24,22,0.7)), url("${getEventImageUrl(event.image)}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } : undefined}
                >
                  <span className="tag">{event.category}</span>
                  <span className="date-stamp">{event.date}<small>{event.month}</small></span>
                </div>
                <div className="card-body">
                  <h3 className="display">{event.title}</h3>
                  <p>{event.description}</p>
                  <div className="meta">
                    <span>{event.venue}</span>
                    <b>{event.seats} seats left</b>
                  </div>
                  <div className="event-card-actions">
                    <button className="btn ghost" onClick={() => setSelected(event)}>View details</button>
                    <button className={`btn ${registered.includes(event.id) ? "secondary" : ""}`} disabled={registered.includes(event.id) || registering === event.id || sessionLoading} onClick={() => void registerEvent(event.id)}>
                      {registered.includes(event.id) ? "Registered" : registering === event.id ? "Registering..." : "Register"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">No events available</div>
          )}
        </div>
      )}
    </section>

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">{selected.category} · {selected.date} {selected.month}</div>
            <h2>{selected.title}</h2>
          </div>
          <button className="close" onClick={() => setSelected(null)}>×</button>
        </div>

        {selected.image && <img src={getEventImageUrl(selected.image)} alt={selected.title} onError={(event) => { event.currentTarget.style.display = "none"; }} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} />}

        <p>{selected.description} Join fellow students at {selected.venue}. Registration closes two days before the event.</p>
        <div className="meta">
          <span>Location <b>{selected.venue}</b></span>
          <span><b>{selected.seats}</b> seats remaining</span>
        </div>

        <div className="modal-actions">
          <button className={`btn ${registered.includes(selected.id) ? "secondary" : ""}`} disabled={registered.includes(selected.id) || registering === selected.id || sessionLoading} onClick={() => void registerEvent(selected.id)}>
            {registered.includes(selected.id) ? "Registered" : registering === selected.id ? "Registering..." : "Register for event"}
          </button>
        </div>
      </div>
    </div>}
  </main>;
}

function AdminView({ events, onBack, onCreate, onAdd, showCreate }: { events: EventItem[]; onBack: () => void; onCreate: () => void; onAdd: (event: Omit<EventItem, "id" | "date" | "month" | "color">) => void; showCreate: boolean }) {
  const [title, setTitle] = useState("");
  return <main className="admin-layout"><aside className="sidebar"><Brand /><div className="side-label">Workspace</div><nav><button className="side-link active">Overview</button><button className="side-link">Events</button><button className="side-link">Registrations</button><button className="side-link">Check-in</button></nav><div className="side-label">Account</div><button className="side-link" onClick={onBack}>← Student view</button></aside><section className="admin-main"><div className="admin-top"><div><div className="eyebrow">Admin dashboard</div><h1 className="display">Good morning, Priya.</h1><p>Here’s what’s happening across campus.</p></div><button className="btn secondary" onClick={onCreate}>+ Create event</button></div><div className="stats"><div className="stat"><strong>{events.length}</strong><span>Total events</span></div><div className="stat"><strong>486</strong><span>Registrations</span></div><div className="stat"><strong>91%</strong><span>Approval rate</span></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Event</th><th>Category</th><th>Date</th><th>Registrations</th><th>Status</th></tr></thead><tbody>{events.map((event, index) => <tr key={event.id}><td><b>{event.title}</b><br /><span style={{ color: "var(--muted)", fontSize: 12 }}>{event.venue}</span></td><td>{event.category}</td><td>{event.date} {event.month}</td><td>{[86, 54, 132, 39][index % 4]} students</td><td><span className={`status ${index === 1 ? "pending" : "approved"}`}>{index === 1 ? "Pending review" : "Published"}</span></td></tr>)}</tbody></table></div></section>{showCreate && <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><div className="eyebrow">New listing</div><h2>Create event</h2></div><button className="close" onClick={onBack}>×</button></div><div className="form-grid"><div className="field full"><label>Event title</label><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Annual sports meet" /></div><div className="field"><label>Category</label><select><option>Workshop</option><option>Competition</option><option>Cultural</option></select></div><div className="field"><label>Venue</label><input placeholder="Main auditorium" /></div><div className="field full"><label>Description</label><textarea placeholder="Tell students what to expect..." /></div></div><div className="modal-actions"><button className="btn ghost" onClick={onBack}>Cancel</button><button className="btn" disabled={!title.trim()} onClick={() => onAdd({ title, category: "Workshop", description: "A new campus event.", venue: "To be announced", seats: 60 })}>Publish event</button></div></div></div>}</main>;
}