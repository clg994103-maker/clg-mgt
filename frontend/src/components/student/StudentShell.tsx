"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentStudent, getStudentNotifications, readStoredStudentProfile, StudentUser } from "../../lib/studentApi";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/config";
import { firebaseLogout, syncFirebaseUser } from "../../lib/firebaseAuth";

export function getStudentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function StudentShell({ children, title, subtitle, publicPage = false }: { children: React.ReactNode; title: string; subtitle: string; publicPage?: boolean }) {
  const [student, setStudent] = useState<StudentUser | null>(readStoredStudentProfile);
  const [checkingAuth, setCheckingAuth] = useState(!publicPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const requiresAuth = !publicPage;

  useEffect(() => {
    if (!requiresAuth) { setCheckingAuth(false); return undefined; }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) { window.location.href = `/student/login?returnTo=${encodeURIComponent(window.location.pathname)}`; return; }
      void getCurrentStudent().then(setStudent).catch(() => syncFirebaseUser(user).then(setStudent)).catch(() => { window.location.href = `/student/login?returnTo=${encodeURIComponent(window.location.pathname)}`; }).finally(() => setCheckingAuth(false));
    });
    return unsubscribe;
  }, [requiresAuth]);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("mousedown", handlePointerDown); document.removeEventListener("keydown", handleKeyDown); };
  }, [menuOpen]);

  useEffect(() => {
    const handleProfileUpdate = () => { void getCurrentStudent().then(setStudent).catch(() => undefined); };
    window.addEventListener("student-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("student-profile-updated", handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (!student) return undefined;
    const loadUnreadCount = () => { void getStudentNotifications().then((data) => setUnreadCount(data.unreadCount)).catch(() => undefined); };
    loadUnreadCount();
    const handleNotificationsUpdate = () => loadUnreadCount();
    window.addEventListener("student-notifications-updated", handleNotificationsUpdate);
    return () => window.removeEventListener("student-notifications-updated", handleNotificationsUpdate);
  }, [student]);

  if (checkingAuth) return <main className="student-state">Checking your session...</main>;

  return <main className="shell"><header className="nav"><button className="brand" style={{ border: 0, background: "none", padding: 0 }} onClick={() => { window.location.href = "/student"; }}><span className="brand-mark">CE</span><span>Campus Events</span></button><nav className="nav-links"><button onClick={() => { window.location.href = "/student"; }}>Dashboard</button><button onClick={() => { window.location.href = "/student/events"; }}>Events</button>{student && <button onClick={() => { window.location.href = "/student/registrations"; }}>My registrations</button>}</nav>{student && <div className="student-nav-actions"><button className="notification-trigger" type="button" onClick={() => { window.location.href = "/student/notifications"; }} aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}><span aria-hidden="true">🔔</span>{unreadCount > 0 && <b>{unreadCount}</b>}</button><div className="profile-menu-wrap" ref={menuRef}><button className="profile-trigger" type="button" onClick={() => setMenuOpen((previous) => !previous)} aria-expanded={menuOpen} aria-label="Student profile menu"><span className="avatar">{getStudentInitials(student.name)}</span></button>{menuOpen && <div className="profile-dropdown" role="menu"><div className="profile-dropdown-header"><div className="avatar large">{getStudentInitials(student.name)}</div><div><strong>{student.name}</strong><span>{student.email}</span></div></div><button type="button" className="profile-menu-item" onClick={() => { setMenuOpen(false); window.location.href = "/student/profile"; }}>Edit profile</button><button type="button" className="profile-menu-item danger" onClick={() => { setMenuOpen(false); void firebaseLogout().finally(() => { window.location.href = "/student/login"; }); }}>Sign out</button></div>}</div></div>}</header><section className="content"><div className="eyebrow">Student workspace</div><h1 className="student-heading display">{title}</h1><p className="hero-copy">{subtitle}</p>{children}</section></main>;
}

export function formatStudentDate(value: string) { return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }