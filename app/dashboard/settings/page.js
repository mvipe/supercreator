"use client";
import { useRouter } from "next/navigation";
import ProfileSettings from "@/components/settings/ProfileSettings";
import BillingSettings from "@/components/settings/BillingSettings";
import PaymentsSettings from "@/components/settings/PaymentsSettings";
import IntegrationsSettings from "@/components/settings/IntegrationsSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";
import { useState } from "react";

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const router = useRouter();

  const tabs = ["profile", "billing", "payments", "integrations", "notifications"];
  const capitalizedTab = tab.charAt(0).toUpperCase() + tab.slice(1);

  return (
    <main className="flex-1 bg-paper">
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="font-display text-2xl font-bold">Account Settings</h1>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-3">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? "border-b-2 border-brand text-brand"
                    : "text-inkmuted hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {tab === "profile" && <ProfileSettings />}
        {tab === "billing" && <BillingSettings />}
        {tab === "payments" && <PaymentsSettings />}
        {tab === "integrations" && <IntegrationsSettings />}
        {tab === "notifications" && <NotificationsSettings />}
      </div>
    </main>
  );
}
