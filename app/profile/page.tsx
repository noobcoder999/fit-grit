"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type ClientProfile = {
  full_name: string | null;
  phone: string | null;
  age: number | null;
  role: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] =
    useState<ClientProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, age, role"
        )
        .eq("id", user.id)
        .single();

      if (
        error ||
        !data ||
        data.role !== "client"
      ) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSignOut() {
    setSigningOut(true);

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="client-profile-loading">
        Loading profile...
      </main>
    );
  }

  const name =
    profile?.full_name?.trim() || "Client";

  const initial =
    name.charAt(0).toUpperCase();

  return (
    <main className="client-profile-page">
      <header className="client-profile-header">
        <button
          type="button"
          className="client-workout-back"
          onClick={() => router.push("/home")}
        >
          ←
        </button>

        <div className="client-profile-eyebrow">
          YOUR ACCOUNT
        </div>

        <h1>
          This is
          <br />
          <em>your space.</em>
        </h1>
      </header>

      <section className="client-profile-card">
        <div className="client-profile-identity">
          <div className="client-profile-avatar">
            {initial}
          </div>

          <div>
            <h2>{name}</h2>
            <span>fit&grit member</span>
          </div>
        </div>

        <div className="client-profile-details">
          <div className="client-profile-row">
            <span>NAME</span>
            <strong>{name}</strong>
          </div>

          <div className="client-profile-row">
            <span>AGE</span>
            <strong>
              {profile?.age
                ? `${profile.age} years`
                : "Not set"}
            </strong>
          </div>

          <div className="client-profile-row">
            <span>PHONE</span>
            <strong>
              {profile?.phone || "Not set"}
            </strong>
          </div>

          <div className="client-profile-row">
            <span>ACCOUNT</span>
            <strong>Client</strong>
          </div>
        </div>
      </section>

      <section className="client-profile-security">
        <div>
          <span className="client-profile-section-label">
            ACCESS
          </span>

          <h3>Your account</h3>

          <p>
            Your phone number and PIN are used to
            securely access your Fit&Grit account.
          </p>
        </div>

        <button
          type="button"
          className="client-profile-logout"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <span>
            {signingOut
              ? "Signing out..."
              : "Sign out"}
          </span>

          <span>→</span>
        </button>
      </section>

      <div className="client-profile-footer">
        fit&grit · built for showing up.
      </div>
    </main>
  );
}