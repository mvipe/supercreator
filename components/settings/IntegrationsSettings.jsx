"use client";
export default function IntegrationsSettings() {
  const integrations = [
    { name: "Telegram", connected: false },
    { name: "Discord", connected: false },
    { name: "WhatsApp", connected: false },
    { name: "Slack", connected: false }
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Integrations</h2>
        <p className="text-sm text-inkmuted">Connect your favorite apps and services</p>
      </div>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <div key={integration.name} className="flex items-center justify-between rounded-lg border border-line p-4">
            <div>
              <div className="font-medium">{integration.name}</div>
              <p className="text-sm text-inkmuted">
                {integration.connected ? "Connected" : "Not connected"}
              </p>
            </div>
            <button className={`btn ${integration.connected ? "btn-ghost" : "btn-brand"}`}>
              {integration.connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
