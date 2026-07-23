"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    target_type: "all",
    expires_at: null,
  });

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    try {
      if (!user) return;
      const { data: profile } = await supabase
        .from("mp_profiles")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (profile?.plan !== "admin" && profile?.plan !== "superadmin") {
        window.location.href = "/dashboard";
        return;
      }
      setIsAdmin(true);
      loadNotifications();
    } catch {
      window.location.href = "/dashboard";
    }
  };

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = await res.json();
      setNotifications(result.notifications || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!formData.title || !formData.message) {
      setMessage("Title and message are required");
      return;
    }

    setSending(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage("Session expired. Please refresh.");
        setSending(false);
        return;
      }

      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to send");
      }

      setMessage(`✓ Notification sent to ${result.count} users!`);
      setFormData({
        title: "",
        message: "",
        type: "info",
        target_type: "all",
        expires_at: null,
      });
      await loadNotifications();
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage(`✕ ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!isAdmin) return null;

  const typeIcons = { info: "ℹ️", success: "✓", warning: "⚠️", error: "✕" };

  return (
    <main className="flex-1 bg-paper">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display text-3xl font-bold mb-1">📢 Send Notifications</h1>
        <p className="text-inkmuted mb-8">Broadcast messages to users based on their subscription plan</p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="card p-6 space-y-5">
              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Notification Type</label>
                <select
                  className="input w-full"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="info">ℹ️ Info</option>
                  <option value="success">✓ Success</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="error">✕ Error</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Title *</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g., New Pro Plan Features"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Message *</label>
                <textarea
                  className="input w-full min-h-24 resize-none"
                  placeholder="Your notification message..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  maxLength={500}
                />
                <p className="text-xs text-inkmuted mt-1">{formData.message.length}/500</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Target Audience</label>
                <div className="space-y-2">
                  {["all", "free_users", "pro_users"].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="target"
                        checked={formData.target_type === option}
                        onChange={(e) => setFormData({ ...formData, target_type: option })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        {option === "all" && "All Users"}
                        {option === "free_users" && "Free Plan Users"}
                        {option === "pro_users" && "Pro Plan Users"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={formData.expires_at || ""}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value || null })}
                />
              </div>

              {message && (
                <div className={`rounded-lg p-3 text-sm font-semibold ${message.startsWith("✓") ? "bg-teal/10 text-teal" : "bg-danger/10 text-danger"}`}>
                  {message}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !formData.title || !formData.message}
                className="btn btn-brand w-full"
              >
                {sending ? "Sending..." : "Send Notification"}
              </button>
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="lg:col-span-2">
            <h2 className="font-display font-bold text-lg mb-4">Recent Notifications</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="card p-6 text-center text-inkmuted">
                  No notifications sent yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="card p-4 hover:bg-white/50 transition-colors">
                    <div className="flex gap-3">
                      <span className="text-xl">{typeIcons[notif.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink">{notif.title}</div>
                        <p className="text-sm text-inkmuted line-clamp-2 mt-1">{notif.message}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="text-xs bg-brand/10 text-brand px-2 py-1 rounded">
                            {notif.target_type === "all" && "All Users"}
                            {notif.target_type === "free_users" && "Free Users"}
                            {notif.target_type === "pro_users" && "Pro Users"}
                          </span>
                          <span className="text-xs text-inkmuted">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Templates */}
            <div className="mt-6">
              <h3 className="font-display font-bold text-lg mb-3">Quick Templates</h3>
              <div className="space-y-2">
                {[
                  {
                    icon: "📢",
                    title: "Feature Announcement",
                    data: {
                      title: "New Features Available",
                      message: "Check out our latest features! Visit your dashboard to explore.",
                      type: "info",
                      target_type: "all",
                    },
                  },
                  {
                    icon: "🎉",
                    title: "Pro Plan Promotion",
                    data: {
                      title: "Upgrade to Pro Plan",
                      message: "Get unlimited courses and lower commissions. Upgrade now!",
                      type: "success",
                      target_type: "free_users",
                    },
                  },
                  {
                    icon: "⚠️",
                    title: "Maintenance Notice",
                    data: {
                      title: "Scheduled Maintenance",
                      message: "We're upgrading our systems. Services may be temporarily unavailable.",
                      type: "warning",
                      target_type: "all",
                    },
                  },
                ].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFormData({ ...formData, ...template.data })}
                    className="w-full text-left card p-4 hover:bg-white/50 transition-colors"
                  >
                    <div className="flex gap-3 items-start">
                      <span className="text-xl">{template.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-ink">{template.title}</div>
                        <p className="text-xs text-inkmuted mt-1 line-clamp-2">{template.data.message}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
