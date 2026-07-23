"use client";
import { useParams } from "next/navigation";
import ProfileSettings from "@/components/settings/ProfileSettings";
import BillingSettings from "@/components/settings/BillingSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";

export default function SettingsPage() {
  const params = useParams();
  const section = params.section;

  const tabs = ["profile", "billing", "notifications"];

  const renderComponent = () => {
    switch (section) {
      case "profile":
        return <ProfileSettings />;
      case "billing":
        return <BillingSettings />;
      case "notifications":
        return <NotificationsSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <main className="flex-1 bg-paper">
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="font-display text-2xl font-bold">Account Settings</h1>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-3">
            {tabs.map((t) => (
              <a
                key={t}
                href={`/dashboard/settings/${t}`}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  section === t
                    ? "border-b-2 border-brand text-brand"
                    : "text-inkmuted hover:text-ink"
                }`}
              >
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {renderComponent()}
      </div>
    </main>
  );
}
