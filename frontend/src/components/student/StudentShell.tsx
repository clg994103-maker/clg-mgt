"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentStudent, getStudentNotifications } from "../../lib/studentApi";
import { firebaseLogout } from "../../lib/firebaseAuth";
import { useStudentSession } from "../../lib/useStudentSession";

export function getStudentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function StudentShell({ children, title, subtitle, publicPage = false }: { children: React.ReactNode; title: string; subtitle: string; publicPage?: boolean }) {
  const { student, loading: sessionLoading, setStudent } = useStudentSession();
  const [checkingAuth, setCheckingAuth] = useState(!publicPage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (publicPage) { setCheckingAuth(false); return; }
    if (!sessionLoading && !student) window.location.href = `/student/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
    setCheckingAuth(sessionLoading || !student);
  }, [publicPage, sessionLoading, student]);

  useEffect(() => {
    if (!mobileMenuOpen && !profileMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileMenuOpen && headerRef.current && !headerRef.current.contains(target)) setMobileMenuOpen(false);
      if (profileMenuOpen && menuRef.current && !menuRef.current.contains(target)) setProfileMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileMenuOpen(false); setProfileMenuOpen(false); } };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("mousedown", handlePointerDown); document.removeEventListener("keydown", handleKeyDown); };
  }, [mobileMenuOpen, profileMenuOpen]);

  useEffect(() => {
    const handleProfileUpdate = () => { void getCurrentStudent().then(setStudent).catch(() => undefined); };
    window.addEventListener("student-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("student-profile-updated", handleProfileUpdate);
  }, [setStudent]);

  useEffect(() => {
    if (!student) return undefined;
    const loadUnreadCount = () => { void getStudentNotifications().then((data) => setUnreadCount(data.unreadCount)).catch(() => undefined); };
    loadUnreadCount();
    const handleNotificationsUpdate = () => loadUnreadCount();
    window.addEventListener("student-notifications-updated", handleNotificationsUpdate);
    return () => window.removeEventListener("student-notifications-updated", handleNotificationsUpdate);
  }, [student]);

  if (checkingAuth) return <main className="student-state">Checking your session...</main>;

  return <main className="shell"><header ref={headerRef} className="nav"><button className="brand" style={{ border: 0, background: "none", padding: 0 }} onClick={() => { window.location.href = "/student" }}><span className="brand-mark">CE</span><span>Campus Events</span></button><button className="mobile-menu-toggle" type="button" aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileMenuOpen} onClick={() => { setProfileMenuOpen(false); setMobileMenuOpen((previous) => !previous); }}><span /><span /><span /></button><nav className={`nav-links ${mobileMenuOpen ? "open" : ""}`}><button onClick={() => { setMobileMenuOpen(false); window.location.href = publicPage ? "/student/events" : "/student"; }}>{publicPage ? "Explore" : "Dashboard"}</button><button onClick={() => { setMobileMenuOpen(false); window.location.href = "/student/events"; }}>Events</button>{student && <button onClick={() => { setMobileMenuOpen(false); window.location.href = "/student/registrations"; }}>My registrations</button>}{!student && publicPage && <button className="mobile-auth-link" onClick={() => { setMobileMenuOpen(false); window.location.href = "/student/login"; }}>Login / Sign up</button>}</nav>{student ? <div className="student-nav-actions"><button className="notification-trigger" type="button" onClick={() => { window.location.href = "/student/notifications"; }} aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}><span aria-hidden="true">🔔</span>{unreadCount > 0 && <b>{unreadCount}</b>}</button><div className="profile-menu-wrap" ref={menuRef}><button className="profile-trigger" type="button" onClick={() => { setMobileMenuOpen(false); setProfileMenuOpen((previous) => !previous); }} aria-expanded={profileMenuOpen} aria-label="Student profile menu"><span className="avatar">{getStudentInitials(student.name)}</span></button>{profileMenuOpen && <div className="profile-dropdown" role="menu"><div className="profile-dropdown-header"><div className="avatar large">{getStudentInitials(student.name)}</div><div><strong>{student.name}</strong><span>{student.email}</span></div></div><button type="button" className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); window.location.href = "/student/profile"; }}>Edit profile</button><button type="button" className="profile-menu-item danger" onClick={() => { setProfileMenuOpen(false); void firebaseLogout().finally(() => { window.location.href = "/student/login"; }); }}>Sign out</button></div>}</div></div> : publicPage ? <button className="nav-auth-button" type="button" onClick={() => { window.location.href = "/student/login"; }}>Login / Sign up</button> : null}</header><section className="content"><div className="eyebrow">Student workspace</div><h1 className="student-heading display">{title}</h1><p className="hero-copy">{subtitle}</p>{children}</section></main>;
}

export function formatStudentDate(value: string) { return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }