"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";

type Invite = {
  id: string;
  code: string;
  status: string;
  created_at: string;
  activated_at: string | null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trainerName, setTrainerName] = useState("Trainer");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/admin");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      await supabase.auth.signOut();
      router.replace("/admin");
      return;
    }

    setTrainerName(profile.full_name || "Trainer");

    const { data: inviteData } = await supabase
      .from("invite_codes")
      .select("id, code, status, created_at, activated_at")
      .order("created_at", { ascending: false });

    setInvites(inviteData || []);

    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "client");

    setClientCount(count || 0);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function makeInviteCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(6);

    crypto.getRandomValues(bytes);

    let result = "FG-";

    for (let i = 0; i < bytes.length; i++) {
      result += chars[bytes[i] % chars.length];
    }

    return result;
  }

  async function generateInvite() {
    setGenerating(true);

    let created = false;

    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const code = makeInviteCode();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("Could not identify trainer:", userError);
        setGenerating(false);
        return;
      }

      const { error } = await supabase
        .from("invite_codes")
        .insert({
          code,
          trainer_id: user.id,
        });

      if (!error) {
        created = true;
      }
    }

    await loadDashboard();
    setGenerating(false);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);

    setCopied(code);

    window.setTimeout(() => {
      setCopied(null);
    }, 1500);
  }

  async function signOut() {
    await supabase.auth.signOut();

    router.replace("/admin");
    router.refresh();
  }

  function scrollToInvites() {
    setMobileMenuOpen(false);

    window.setTimeout(() => {
      document
        .getElementById("invite-codes")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  const unusedCount = invites.filter(
    (invite) => invite.status === "unused"
  ).length;

  const activatedCount = invites.filter(
    (invite) => invite.status === "activated"
  ).length;

  if (loading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-mark">F&G</div>
        <p>Opening your workspace...</p>
      </main>
    );
  }

  return (
    <main className="trainer-dashboard">
      {/* =====================================================
          DESKTOP SIDEBAR
         ===================================================== */}

      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-logo">
            <div className="brand-mark">F&G</div>

            <span className="brand-name">
              fit<span>&</span>grit.
            </span>
          </div>

          <nav className="dashboard-nav">
            <button className="nav-item active">
              <span>⌂</span>
              Overview
            </button>

            <button
              className="nav-item"
              onClick={() => router.push("/admin/clients")}
            >
              <span>◎</span>
              Clients
            </button>

            <button
              className="nav-item"
              onClick={scrollToInvites}
            >
              <span>＋</span>
              Invite codes
            </button>

            <div className="nav-divider" />

            <button
              className="nav-item muted"
              disabled
            >
              <span>▤</span>
              Programs
              <small>SOON</small>
            </button>

            <button
              className="nav-item muted"
              disabled
            >
              <span>◇</span>
              Diet plans
              <small>SOON</small>
            </button>

            <button
              className="nav-item muted"
              disabled
            >
              <span>▶</span>
              Exercise library
              <small>SOON</small>
            </button>
          </nav>
        </div>

        <button
          className="sidebar-profile"
          onClick={signOut}
        >
          <div className="profile-avatar">
            {trainerName.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{trainerName}</strong>
            <span>Trainer · Sign out</span>
          </div>
        </button>
      </aside>

      {/* =====================================================
          MOBILE HAMBURGER BUTTON
         ===================================================== */}

<div className="mobile-admin-topbar">
  <button
    type="button"
    className="mobile-admin-menu-button"
    aria-label="Open trainer menu"
    onClick={() => setMobileMenuOpen(true)}
  >
    ☰
  </button>

  <span className="mobile-admin-brand">
    fit<span>&</span>grit.
  </span>
</div>

      {/* =====================================================
          MOBILE SIDE DRAWER
         ===================================================== */}

      {mobileMenuOpen && (
        <div
          className="mobile-admin-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="mobile-admin-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-admin-drawer-header">
              <div className="dashboard-logo">
                <div className="brand-mark">F&G</div>

                <span className="brand-name">
                  fit<span>&</span>grit.
                </span>
              </div>

              <button
                type="button"
                className="mobile-admin-close"
                aria-label="Close trainer menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <nav className="mobile-admin-nav">
              <button
                type="button"
                className="active"
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/admin/dashboard");
                }}
              >
                <span>⌂</span>
                Overview
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/admin/clients");
                }}
              >
                <span>◎</span>
                Clients
              </button>

              <button
                type="button"
                onClick={scrollToInvites}
              >
                <span>＋</span>
                Invite codes
              </button>

              <div className="mobile-admin-divider" />

              <button
                type="button"
                className="mobile-admin-muted"
                disabled
              >
                <span>▤</span>
                Programs
                <small>SOON</small>
              </button>

              <button
                type="button"
                className="mobile-admin-muted"
                disabled
              >
                <span>◇</span>
                Diet plans
                <small>SOON</small>
              </button>

              <button
                type="button"
                className="mobile-admin-muted"
                disabled
              >
                <span>▶</span>
                Exercise library
                <small>SOON</small>
              </button>
            </nav>

            <div className="mobile-admin-profile">
              <div className="profile-avatar">
                {trainerName.charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{trainerName}</strong>
                <span>Trainer account</span>
              </div>
            </div>

            <button
              type="button"
              className="mobile-admin-signout"
              onClick={signOut}
            >
              Sign out
            </button>
          </aside>
        </div>
      )}

      {/* =====================================================
          DASHBOARD CONTENT
         ===================================================== */}

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-kicker">
              TRAINER WORKSPACE
            </span>

            <h1>
              Good to see you,
              <br />
              <em>{trainerName}.</em>
            </h1>
          </div>

          <button
            className="new-invite-button"
            onClick={generateInvite}
            disabled={generating}
          >
            <span>＋</span>

            {generating
              ? "Generating..."
              : "New invite"}
          </button>
        </header>

        <section className="dashboard-stats">
          <article className="stat-card">
            <span className="stat-label">
              CLIENTS
            </span>

            <strong>{clientCount}</strong>

            <p>People training with you</p>
          </article>

          <article className="stat-card">
            <span className="stat-label">
              AVAILABLE INVITES
            </span>

            <strong>{unusedCount}</strong>

            <p>Ready to share</p>
          </article>

          <article className="stat-card">
            <span className="stat-label">
              ACTIVATED
            </span>

            <strong>{activatedCount}</strong>

            <p>Codes already claimed</p>
          </article>

          <article className="stat-card accent-stat">
            <span className="stat-label">
              THIS WEEK
            </span>

            <strong>—</strong>

            <p>Workout tracking coming next</p>
          </article>
        </section>

        <section className="dashboard-content-grid">
          <article
            id="invite-codes"
            className="dashboard-panel invites-panel"
          >
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  ACCESS
                </span>

                <h2>Recent invite codes</h2>
              </div>

              <button
                className="text-action"
                onClick={generateInvite}
                disabled={generating}
              >
                + Generate
              </button>
            </div>

            {invites.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ＋
                </div>

                <h3>No invites yet.</h3>

                <p>
                  Generate your first code and send it
                  to a client.
                </p>

                <button
                  className="empty-action"
                  onClick={generateInvite}
                  disabled={generating}
                >
                  Generate first invite →
                </button>
              </div>
            ) : (
              <div className="invite-list">
                {invites
                  .slice(0, 6)
                  .map((invite) => (
                    <div
                      className="invite-row"
                      key={invite.id}
                    >
                      <div>
                        <strong>
                          {invite.code}
                        </strong>

                        <span>
                          {new Date(
                            invite.created_at
                          ).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="invite-row-actions">
                        <span
                          className={`status-pill status-${invite.status}`}
                        >
                          {invite.status}
                        </span>

                        <button
                          className="copy-button"
                          onClick={() =>
                            copyCode(invite.code)
                          }
                        >
                          {copied === invite.code
                            ? "Copied!"
                            : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </article>

          <article className="dashboard-panel quick-panel">
            <span className="panel-kicker">
              QUICK START
            </span>

            <h2>Bring someone in.</h2>

            <p>
              Create an invite, send it to your
              client, and fit&grit takes care of
              their activation.
            </p>

            <div className="quick-steps">
              <div>
                <span>01</span>
                <p>
                  Generate a unique invite code.
                </p>
              </div>

              <div>
                <span>02</span>
                <p>
                  Share it privately with your
                  client.
                </p>
              </div>

              <div>
                <span>03</span>
                <p>
                  They activate their profile and
                  start training.
                </p>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}