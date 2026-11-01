"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type ClientProfile = {
  full_name: string | null;
  role: string;
};

type Membership = {
  membership_start_date: string;
  membership_end_date: string;
};

function todayKey() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDaysRemaining(endDate: string) {
  const today = new Date(`${todayKey()}T00:00:00`);
  const expiry = new Date(`${endDate}T00:00:00`);

  const difference = expiry.getTime() - today.getTime();

  return Math.max(
    0,
    Math.ceil(difference / (1000 * 60 * 60 * 24))
  );
}

function formatDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] =
    useState<ClientProfile | null>(null);

  const [membership, setMembership] =
    useState<Membership | null>(null);

  const [activeMemberCount, setActiveMemberCount] =
  useState<number | null>(null);

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

      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("client_memberships")
        .select(
          "membership_start_date, membership_end_date"
        )
        .eq("client_id", user.id)
        .maybeSingle();

      if (membershipError) {
        console.error(
          "Membership load error:",
          membershipError
        );
      }

      setProfile(data);
      setMembership(membershipData || null);
      setLoading(false);

      const {
  data: memberCount,
  error: memberCountError,
} = await supabase.rpc(
  "get_my_trainer_active_member_count"
);

if (memberCountError) {
  console.error(
    "Active member count error:",
    memberCountError
  );
} else {
  setActiveMemberCount(
    Number(memberCount || 0)
  );
}
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
    profile?.full_name?.trim().split(/\s+/)[0] ||
    "there";

  const firstName =
    rawFirstName.charAt(0).toUpperCase() +
    rawFirstName.slice(1).toLowerCase();

  const membershipExpired =
    membership
      ? membership.membership_end_date < todayKey()
      : false;

  const daysRemaining =
    membership && !membershipExpired
      ? getDaysRemaining(
          membership.membership_end_date
        )
      : 0;

  return (
    <main className="client-home-page">
      <div className="client-home-glow client-home-glow-one" />
      <div className="client-home-glow client-home-glow-two" />

<header className="client-home-header">
  <div className="client-home-brand-wrap">
    <div className="client-home-brand">
      fit&grit.
    </div>

    <div className="client-home-tagline">
      built for showing up.
    </div>
  </div>

  {activeMemberCount !== null && (
    <div className="client-active-members client-active-members-header">
      <span className="client-active-members-dot" />

      <strong>{activeMemberCount+5}</strong>

      <span>
        active{" "}
        {activeMemberCount === 1
          ? "member"
          : "members"}
      </span>
    </div>
  )}

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

      {/* =========================
          MEMBERSHIP STATUS
         ========================= */}

      <section
        className="client-membership-summary"
        onClick={() => router.push("/profile")}
      >
        <div className="client-membership-summary-top">
          <div>
            <span className="client-membership-summary-label">
              MEMBERSHIP
            </span>

            <h2>
              {membership
                ? membershipExpired
                  ? "Membership expired"
                  : "You’re active."
                : "Not activated yet"}
            </h2>
          </div>

          <div
            className={`client-membership-pill ${
              membershipExpired
                ? "expired"
                : membership
                  ? "active"
                  : "pending"
            }`}
          >
            {membershipExpired
              ? "Expired"
              : membership
                ? "Active"
                : "Pending"}
          </div>
        </div>

        {membership ? (
          <div className="client-membership-summary-bottom">
            <div>
              <span>DAYS REMAINING</span>

              <strong>
                {membershipExpired
                  ? "0"
                  : daysRemaining}
              </strong>
            </div>

            <div>
              <span>VALID UNTIL</span>

              <strong>
                {formatDate(
                  membership.membership_end_date
                )}
              </strong>
            </div>

            <div className="client-membership-summary-arrow">
              →
            </div>
          </div>
        ) : (
          <p>
            Your trainer hasn&apos;t started your
            membership yet.
          </p>
        )}
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
            <div className="client-nav-number">
              01
            </div>

            <div className="client-nav-content">
              <span>TRAIN</span>
              <h3>Workout plan</h3>
              <p>
                Your sessions, exercises and progress.
              </p>
            </div>

            <div className="client-nav-arrow">
              ↗
            </div>
          </button>

          <button
            className="client-nav-card"
            type="button"
            onClick={() => router.push("/diet")}
          >
            <div className="client-nav-number">
              02
            </div>

            <div className="client-nav-content">
              <span>FUEL</span>
              <h3>Diet plan</h3>
              <p>
                Your meals and nutrition plan.
              </p>
            </div>

            <div className="client-nav-arrow">
              ↗
            </div>
          </button>

          <button
            className="client-nav-card"
            type="button"
            onClick={() => router.push("/calendar")}
          >
            <div className="client-nav-number">
              03
            </div>

            <div className="client-nav-content">
              <span>TRACK</span>
              <h3>Calendar</h3>
              <p>
                See your sessions and mark attendance.
              </p>
            </div>

            <div className="client-nav-arrow">
              ↗
            </div>
          </button>

          <button
            className="client-nav-card"
            type="button"
            onClick={() => router.push("/exercises")}
          >
            <div className="client-nav-number">
              04
            </div>

            <div className="client-nav-content">
              <span>LEARN</span>
              <h3>Basic workouts</h3>
              <p>
                Exercise demos and form guidance.
              </p>
            </div>

            <div className="client-nav-arrow">
              ↗
            </div>
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