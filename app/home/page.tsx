"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type ClientProfile = {
  full_name: string | null;
  role: string;
};

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClient() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (error || !data || data.role !== "client") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadClient();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="client-home-loading">
        <div className="loading-mark">F&G</div>
      </main>
    );
  }

const rawFirstName =
  profile?.full_name?.trim().split(/\s+/)[0] || "there";

const firstName =
  rawFirstName.charAt(0).toUpperCase() +
  rawFirstName.slice(1).toLowerCase();

  return (
    <main className="client-home-page">
      <div className="client-home-glow client-home-glow-one" />
      <div className="client-home-glow client-home-glow-two" />

      <header className="client-home-header">
        <div>
          <div className="client-home-brand">fit&grit.</div>
          <div className="client-home-tagline">built for showing up.</div>
        </div>

        <button
          className="client-avatar"
          type="button"
          onClick={() => router.push("/profile")}
        >
          {firstName.charAt(0).toUpperCase()}
        </button>
      </header>

      <section className="client-home-hero">
        <div className="client-home-eyebrow">
          <span />
          YOUR SPACE
        </div>

        <h1>
          Hey, {firstName}.
          <br />
          Ready to <em>show up?</em>
        </h1>

        <p>
          Your training, nutrition and progress.
          <br />
          Everything in one place.
        </p>
      </section>

      <section className="client-today-card">
        <div>
          <div className="client-card-label">TODAY</div>
          <h2>No workout assigned yet</h2>
          <p>Your trainer’s next plan will appear here.</p>
        </div>

        <div className="client-today-icon">→</div>
      </section>

      <section className="client-section">
        <div className="client-section-title">
          <span>YOUR PLAN</span>
        </div>

        <div className="client-grid">
          <button
            className="client-nav-card client-nav-card-featured"
            type="button"
            onClick={() => router.push("/workouts")}
          >
            <div className="client-nav-number">01</div>

            <div className="client-nav-content">
              <span>TRAIN</span>
              <h3>Workout plan</h3>
              <p>Your sessions, exercises and progress.</p>
            </div>

            <div className="client-nav-arrow">↗</div>
          </button>

          <button
            className="client-nav-card"
            type="button"
            onClick={() => router.push("/diet")}
          >
            <div className="client-nav-number">02</div>

            <div className="client-nav-content">
              <span>FUEL</span>
              <h3>Diet plan</h3>
              <p>Your meals and nutrition plan.</p>
            </div>

            <div className="client-nav-arrow">↗</div>
          </button>

          <button
            className="client-nav-card"
            type="button"
            onClick={() => router.push("/calendar")}
          >
            <div className="client-nav-number">03</div>

            <div className="client-nav-content">
              <span>TRACK</span>
              <h3>Calendar</h3>
              <p>See your sessions and mark attendance.</p>
            </div>

            <div className="client-nav-arrow">↗</div>
          </button>

          <button
            className="client-nav-card"
            type="button"
            onClick={() => router.push("/exercises")}
          >
            <div className="client-nav-number">04</div>

            <div className="client-nav-content">
              <span>LEARN</span>
              <h3>Basic workouts</h3>
              <p>Exercise demos and form guidance.</p>
            </div>

            <div className="client-nav-arrow">↗</div>
          </button>
        </div>
      </section>

      <nav className="client-bottom-nav">
        <button className="active" type="button">
          <span>⌂</span>
          Home
        </button>

        <button
          type="button"
          onClick={() => router.push("/workouts")}
        >
          <span>△</span>
          Train
        </button>

        <button
          type="button"
          onClick={() => router.push("/calendar")}
        >
          <span>□</span>
          Calendar
        </button>

        <button
          type="button"
          onClick={() => router.push("/profile")}
        >
          <span>○</span>
          Profile
        </button>
      </nav>
    </main>
  );
}