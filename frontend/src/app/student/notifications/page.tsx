"use client";

import { useEffect, useState } from "react";
import { getStudentNotifications, StudentNotification, studentFetch } from "../../../lib/studentApi";
import { StudentShell } from "../../../components/student/StudentShell";

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function destination(notification: StudentNotification) {
  if (notification.registrationId) return `/student/registrations/${notification.registrationId}`;
  if (notification.eventId) return `/student/events/${notification.eventId}`;
  return "/student/notifications";
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadNotifications() {
    setLoading(true);
    void getStudentNotifications().then((data) => setNotifications(data.notifications)).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load notifications")).finally(() => setLoading(false));
  }

  useEffect(() => { loadNotifications(); }, []);

  async function openNotification(notification: StudentNotification) {
    try {
      if (!notification.isRead) {
        await studentFetch(`/api/notifications/${notification._id}/read`, { method: "PATCH" });
        setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
        window.dispatchEvent(new Event("student-notifications-updated"));
      }
      const target = destination(notification);
      if (target !== "/student/notifications") window.location.href = target;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update notification");
    }
  }

  async function markAllRead() {
    try {
      await studentFetch("/api/notifications/read-all", { method: "PATCH" });
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
      window.dispatchEvent(new Event("student-notifications-updated"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update notifications");
    }
  }

  const visibleNotifications = filter === "unread" ? notifications.filter((notification) => !notification.isRead) : notifications;
  return <StudentShell title="Notifications" subtitle="Stay current with your registrations, events and check-in activity."><div className="notification-toolbar"><div className="filters"><button className={`filter ${filter === "unread" ? "active" : ""}`} onClick={() => setFilter("unread")}>Unread</button><button className={`filter ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button></div><button className="btn ghost" onClick={() => void markAllRead()} disabled={!notifications.some((notification) => !notification.isRead)}>Mark all as read</button></div>{error && <div className="admin-error">{error}</div>}{loading ? <div className="student-state">Loading notifications...</div> : visibleNotifications.length === 0 ? <div className="student-state">No {filter === "unread" ? "unread " : ""}notifications.</div> : <div className="notification-list">{visibleNotifications.map((notification) => <button className={`notification-row ${notification.isRead ? "read" : "unread"}`} key={notification._id} onClick={() => void openNotification(notification)}><span className="notification-icon" aria-hidden="true">🔔</span><span className="notification-copy"><strong>{notification.title}</strong><span>{notification.message}</span><small>{relativeTime(notification.createdAt)}</small></span>{!notification.isRead && <i aria-label="Unread" />}</button>)}</div>}</StudentShell>;
}