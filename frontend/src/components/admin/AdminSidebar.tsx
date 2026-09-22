"use client";

import { useState } from "react";

const links = [
  ["Overview", "/admin"],
  ["Events", "/admin"],
  ["Registrations", "/admin/participants"],
  ["Check-in", "/admin/check-in"],
] as const;

export default function AdminSidebar({ active }: { active: "overview" | "participants" | "check-in" }) {
  const [open, setOpen] = useState(false);
  function navigate(path: string) {
    setOpen(false);
    window.location.href = path;
  }
  return <>
    <button className="admin-mobile-toggle" type="button" aria-label={open ? "Close admin navigation" : "Open admin navigation"} aria-expanded={open} onClick={() => setOpen((current) => !current)}><span /><span /><span /></button>
    {open && <button className="admin-sidebar-backdrop" aria-label="Close admin navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar admin-sidebar ${open ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark">CE</span><span>Campus Events</span></div>
      <div className="side-label">Workspace</div>
      <nav>{links.map(([label, path]) => <button key={label} className={`side-link ${active === (label === "Check-in" ? "check-in" : label === "Registrations" ? "participants" : label === "Overview" ? "overview" : "events") ? "active" : ""}`} onClick={() => navigate(path)}>{label}</button>)}</nav>
      <div className="side-label">Account</div>
      <button className="side-link" onClick={() => { window.localStorage.removeItem("campus_admin_key"); navigate("/admin"); }}>Sign out</button>
    </aside>
  </>;
}
