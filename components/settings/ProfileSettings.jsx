"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Field } from "@/components/ui";

export default function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    full_name: "",
    display_name: "",
    phone_number: "",
    bio: "",
    avatar_url: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      supabase
        .from("mp_profiles")
        .select("full_name, display_name, phone_number, bio, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfile(data);
          setLoading(false);
        });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("mp_profiles")
        .update({
          full_name: profile.full_name,
          display_name: profile.display_name,
          phone_number: profile.phone_number,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          profile_complete: true
        })
        .eq("user_id", user.id);

      if (error) throw error;
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Basic Information</h2>
        <p className="text-sm text-inkmuted">Update your personal details</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="First name">
          <input
            type="text"
            className="input"
            value={profile.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
            placeholder="Your name"
          />
        </Field>
        <Field label="Phone number">
          <input
            type="tel"
            className="input"
            value={profile.phone_number}
            onChange={(e) => handleChange("phone_number", e.target.value)}
            placeholder="+91 XXXXX XXXXX"
          />
        </Field>
      </div>

      <Field label="Display name">
        <input
          type="text"
          className="input"
          value={profile.display_name}
          onChange={(e) => handleChange("display_name", e.target.value)}
          placeholder="How you'd like to be called"
        />
      </Field>

      <Field label="About me">
        <textarea
          className="input min-h-24"
          value={profile.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          placeholder="Tell us about yourself"
        />
      </Field>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.includes("success") ? "bg-teal-soft text-teal" : "bg-danger/10 text-danger"}`}>
          {message}
        </div>
      )}

      <button onClick={handleSave} disabled={saving} className="btn btn-brand">
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
