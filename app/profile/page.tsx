"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type ClientProfile = {
  full_name: string | null;
  phone: string | null;
  age: number | null;
  role: string;
  created_at: string;
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

function formatJoinedDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] =
    useState<ClientProfile | null>(null);

  const [membership, setMembership] =
    useState<Membership | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [signingOut, setSigningOut] =
    useState(false);

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
          "full_name, phone, age, role, created_at"
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
            <span>JOINED FIT&GRIT</span>

            <strong>
              {profile?.created_at
                ? formatJoinedDate(
                    profile.created_at
                  )
                : "—"}
            </strong>
          </div>

          <div className="client-profile-row">
            <span>ACCOUNT</span>
            <strong>Client</strong>
          </div>
        </div>
      </section>

      {/* =========================
          MEMBERSHIP DETAILS
         ========================= */}

      <section className="client-profile-membership">
        <div className="client-profile-membership-heading">
          <div>
            <span>MEMBERSHIP</span>
            <h3>Your membership</h3>
          </div>

          <div
            className={`client-profile-membership-status ${
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
          <>
            <div className="client-profile-membership-days">
              <span>DAYS REMAINING</span>

              <strong>
                {membershipExpired
                  ? "0"
                  : daysRemaining}
              </strong>

              <p>
                {membershipExpired
                  ? "Contact your trainer to renew your membership."
                  : "days left in your current membership"}
              </p>
            </div>

            <div className="client-profile-membership-grid">
              <div>
                <span>STARTED</span>

                <strong>
                  {formatDate(
                    membership.membership_start_date
                  )}
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
            </div>
          </>
        ) : (
          <div className="client-profile-membership-empty">
            <strong>
              Membership not started yet.
            </strong>

            <p>
              Your trainer will activate your membership
              once your plan begins.
            </p>
          </div>
        )}
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