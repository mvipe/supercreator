"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/supabase";

export default function NotificationsPanel() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "info",
    target_type: "all",
    expires_at: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSend = async () => {
    if (!form.title || !form.message) {
      setError("Title and message are required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/admin/notifications", {
        title: form.title,
        message: form.message,
        type: form.type,
        target_type: form.target_type,
        expires_at: form.expires_at || null
      }, "POST");

      if (response.success) {
        setSuccess(`Notification sent to ${form.target_type === "all" ? "all users" : form.target_type === "free_users" ? "free plan users" : "pro plan users"}!`);
        setForm({ title: "", message: "", type: "info", target_type: "all", expires_at: "" });
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(err.message || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: "info", label: "Info", color: "bg-blue-50 text-blue-800" },
    { value: "success", label: "Success", color: "bg-teal-soft text-teal" },
    { value: "warning", label: "Warning", color: "bg-yellow-100 text-yellow-800" },
    { value: "error", label: "Error", color: "bg-danger/10 text-danger" }
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-ink">Send Notifications</h2>
        <p className="mt-1 text-inkmuted">Send notifications to users or broadcast to all</p>
      </div>

      <div className="max-w-2xl space-y-6 rounded-lg border border-line bg-white p-6">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Title *</label>
          <input
            type="text"
            className="w-full px-4 py-2 rounded-lg bg-paper text-ink placeholder-inkmuted border border-line focus:border-brand focus:outline-none"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Notification title"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Message *</label>
          <textarea
            className="w-full px-4 py-2 rounded-lg bg-paper text-ink placeholder-inkmuted border border-line focus:border-brand focus:outline-none"
            rows={4}
            value={form.message}
            onChange={(e) => handleChange("message", e.target.value)}
            placeholder="Notification message"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Type</label>
            <select
              className="w-full px-4 py-2 rounded-lg bg-paper text-ink border border-line focus:border-brand focus:outline-none"
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Target Audience</label>
            <select
              className="w-full px-4 py-2 rounded-lg bg-paper text-ink border border-line focus:border-brand focus:outline-none"
              value={form.target_type}
              onChange={(e) => handleChange("target_type", e.target.value)}
            >
              <option value="all">All users</option>
              <option value="free_users">Free plan users</option>
              <option value="pro_users">Pro plan users</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Expires At (optional)</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 rounded-lg bg-paper text-ink placeholder-inkmuted border border-line focus:border-brand focus:outline-none"
              value={form.expires_at}
              onChange={(e) => handleChange("expires_at", e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-teal-soft p-3 text-sm text-teal">
            ✓ {success}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Sending..." : "Send Notification"}
        </button>
      </div>
    </div>
  );
}
