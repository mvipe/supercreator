"use client";
import { useState } from "react";

export default function NotificationsSettings() {
  const [notifications, setNotifications] = useState({
    courseEnrollment: true,
    courseCompletion: true,
    newMessage: true,
    paymentReceived: true,
    weeklyDigest: false
  });

  const handleToggle = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    });
  };

  const notificationOptions = [
    { key: "courseEnrollment", label: "Course enrollment", desc: "Notify when someone enrolls in your course" },
    { key: "courseCompletion", label: "Course completion", desc: "Notify when a student completes your course" },
    { key: "newMessage", label: "New messages", desc: "Notify when you receive new messages" },
    { key: "paymentReceived", label: "Payment received", desc: "Notify when you receive a payment" },
    { key: "weeklyDigest", label: "Weekly digest", desc: "Get a summary of activity every week" }
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Notification preferences</h2>
        <p className="text-sm text-inkmuted">Choose what notifications you'd like to receive</p>
      </div>

      <div className="space-y-3">
        {notificationOptions.map((option) => (
          <div key={option.key} className="flex items-start justify-between rounded-lg border border-line p-4">
            <div>
              <div className="font-medium">{option.label}</div>
              <p className="text-sm text-inkmuted">{option.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications[option.key]}
                onChange={() => handleToggle(option.key)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-line peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
            </label>
          </div>
        ))}
      </div>

      <button className="btn btn-brand">Save preferences</button>
    </div>
  );
}
