"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function DashboardNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  async function loadNotifications() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      setNotifications(result.notifications || []);
      setUnreadCount(result.notifications?.filter((n) => !n.read_at).length || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("mp_user_notifications")
        .upsert({
          notification_id: notificationId,
          user_id: user.id,
          read_at: new Date().toISOString(),
        });

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  if (loading) return null;

  const typeIcons = {
    info: "ℹ️",
    success: "✓",
    warning: "⚠️",
    error: "✕",
  };

  if (notifications.length === 0) return null;

  return (
    <div className="bg-paper rounded-2xl border-2 border-line overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📢</span>
          <div className="text-left">
            <div className="font-bold text-ink">Notifications</div>
            <div className="text-xs text-inkmuted">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <div className="bg-danger text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
          <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-line divide-y divide-line bg-white max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-inkmuted text-sm">No notifications</div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`w-full p-4 text-left transition-colors hover:bg-paper flex gap-3 ${
                  notif.read_at ? "opacity-75" : ""
                }`}
              >
                <div className="text-xl shrink-0">{typeIcons[notif.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-black">{notif.title}</div>
                  <div className="text-sm text-black mt-1 line-clamp-2">{notif.message}</div>
                  <div className="text-xs text-inkmuted mt-2">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </div>
                </div>
                {!notif.read_at && (
                  <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
