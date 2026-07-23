"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState({
    free_plan_commission: 30,
    pro_plan_commission: 10,
    pro_plan_price: 4.99,
  });

  useEffect(() => {
    checkSuperAdmin();
  }, [user]);

  const checkSuperAdmin = async () => {
    try {
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const me = await res.json();

      if (!me.superAdmin) {
        window.location.href = "/dashboard";
        return;
      }

      setIsSuperAdmin(true);
      loadSettings();
    } catch (error) {
      console.error("Superadmin check failed:", error);
      window.location.href = "/dashboard";
    }
  };

  const loadSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const result = await res.json();
        if (result.settings) {
          const loaded = result.settings;
          setSettings({
            free_plan_commission: Number(loaded.free_plan_commission ?? 30),
            pro_plan_commission: Number(loaded.pro_plan_commission ?? 10),
            pro_plan_price: Number(loaded.pro_plan_price ?? 4.99),
          });
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage("Session expired. Please refresh.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(settings),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save");
      }

      if (result.settings) {
        const loaded = result.settings;
        setSettings({
          free_plan_commission: Number(loaded.free_plan_commission ?? 30),
          pro_plan_commission: Number(loaded.pro_plan_commission ?? 10),
          pro_plan_price: Number(loaded.pro_plan_price ?? 4.99),
        });
      }

      setMessage("✓ Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(`✕ ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!isSuperAdmin) return null;

  const freePlanEarnings = 100 - settings.free_plan_commission;
  const proPlanEarnings = 100 - settings.pro_plan_commission;

  return (
    <main className="flex-1 bg-paper">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="font-display text-3xl font-bold mb-1">⚙️ Platform Settings</h1>
        <p className="text-inkmuted mb-8">Configure subscription plans, commission rates, and pricing</p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Settings Form */}
          <div className="lg:col-span-1">
            <div className="card p-6 space-y-6">
              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Free Plan Commission (%)</label>
                <p className="text-xs text-inkmuted mb-2">Percentage taken from each course sale</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="input w-full"
                  value={settings.free_plan_commission}
                  onChange={(e) => setSettings({ ...settings, free_plan_commission: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Pro Plan Commission (%)</label>
                <p className="text-xs text-inkmuted mb-2">Lower commission for pro subscribers</p>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="input w-full"
                  value={settings.pro_plan_commission}
                  onChange={(e) => setSettings({ ...settings, pro_plan_commission: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-ink block mb-2">Pro Plan Monthly Price (₹)</label>
                <p className="text-xs text-inkmuted mb-2">Subscription cost for pro users</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input w-full"
                    value={settings.pro_plan_price}
                    onChange={(e) => setSettings({ ...settings, pro_plan_price: Number(e.target.value) })}
                  />
                </div>
              </div>

              {message && (
                <div className={`rounded-lg p-3 text-sm font-semibold ${message.startsWith("✓") ? "bg-teal/10 text-teal" : "bg-danger/10 text-danger"}`}>
                  {message}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-brand w-full"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Preview Cards */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {/* Free Plan */}
              <div className="card p-6 border-2 border-line">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display font-bold text-lg">Free Plan</h2>
                    <p className="text-sm text-inkmuted">Commission-based earnings</p>
                  </div>
                  <span className="text-3xl">🆓</span>
                </div>

                <div className="space-y-3 bg-white rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-inkmuted">Commission Rate:</span>
                    <span className="font-semibold">{settings.free_plan_commission}%</span>
                  </div>
                  <div className="border-t border-line pt-3 flex justify-between text-sm">
                    <span className="text-inkmuted">Creator Earnings:</span>
                    <span className="font-bold text-teal">{freePlanEarnings}%</span>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-inkmuted mt-3">
                    <p>💡 Example: On a ₹1000 course sale</p>
                    <p className="mt-1">
                      Platform takes: ₹{Math.round(1000 * (settings.free_plan_commission / 100))}
                    </p>
                    <p>
                      Creator gets: ₹{Math.round(1000 * (freePlanEarnings / 100))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="card p-6 border-2 border-brand">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display font-bold text-lg">Pro Plan</h2>
                    <p className="text-sm text-inkmuted">Lower commissions for monthly fee</p>
                  </div>
                  <span className="text-3xl">👑</span>
                </div>

                <div className="space-y-3 bg-white rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-inkmuted">Monthly Price:</span>
                    <span className="font-semibold">₹{settings.pro_plan_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-inkmuted">Commission Rate:</span>
                    <span className="font-semibold">{settings.pro_plan_commission}%</span>
                  </div>
                  <div className="border-t border-line pt-3 flex justify-between text-sm">
                    <span className="text-inkmuted">Creator Earnings:</span>
                    <span className="font-bold text-brand">{proPlanEarnings}%</span>
                  </div>

                  <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 text-xs text-inkmuted mt-3">
                    <p>💡 Example: On a ₹1000 course sale</p>
                    <p className="mt-1">
                      Platform takes: ₹{Math.round(1000 * (settings.pro_plan_commission / 100))}
                    </p>
                    <p>
                      Creator gets: ₹{Math.round(1000 * (proPlanEarnings / 100))}
                    </p>
                    <p className="mt-2 text-inkmuted">
                      Plus monthly subscription: ₹{settings.pro_plan_price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Commission Comparison */}
              <div className="card p-6 bg-gradient-to-br from-ink/5 to-brand/5">
                <h3 className="font-display font-bold mb-4">Comparison at Different Price Points</h3>
                <div className="space-y-3 text-sm">
                  {[500, 1000, 2000, 5000].map((price) => (
                    <div key={price} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="text-inkmuted">₹{price} course sale</span>
                      <div className="flex gap-8 text-xs">
                        <div>
                          <p className="text-inkmuted">Free: ₹{Math.round(price * (freePlanEarnings / 100))}</p>
                        </div>
                        <div>
                          <p className="text-brand font-semibold">Pro: ₹{Math.round(price * (proPlanEarnings / 100))}</p>
                        </div>
                        <div>
                          <p className="text-teal font-semibold">Diff: +₹{Math.round(price * ((freePlanEarnings - proPlanEarnings) / 100))}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
