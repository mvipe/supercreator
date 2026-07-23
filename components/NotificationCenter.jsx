"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Refresh every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await apiFetch("/api/notifications", undefined, "GET");
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiFetch("/api/notifications", { notificationId, read: true }, "PATCH");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const getTypeColor = (type) => {
    switch (type) {
      case "success":
        return "bg-teal-soft text-teal";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-danger/10 text-danger";
      default:
        return "bg-blue-50 text-blue-800";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 hover:bg-white/10 text-white"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-line bg-white shadow-lg overflow-hidden">
          <div className="border-b border-line p-4 flex items-center justify-between bg-paper">
            <div className="font-display font-bold text-black">Notifications</div>
            <button onClick={() => setOpen(false)} className="text-inkmuted hover:text-ink">✕</button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-inkmuted text-sm">
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-line p-4 cursor-pointer hover:bg-paper/50 transition-colors ${
                    !n.read_at ? "bg-brand/5" : ""
                  }`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 px-2 py-1 rounded text-xs font-semibold capitalize ${getTypeColor(n.type)}`}>
                      {n.type}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-black text-sm">{n.title}</div>
                      <div className="text-sm text-black mt-1">{n.message}</div>
                      <div className="text-xs text-inkmuted mt-2">
                        {new Date(n.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {!n.read_at && <div className="shrink-0 h-2 w-2 rounded-full bg-brand mt-2" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
