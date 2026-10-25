"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError || !data.user) {
      setError("That login didn’t work. Check your details and try again.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("This account doesn’t have trainer access.");
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <div className="admin-glow admin-glow-one" />
      <div className="admin-glow admin-glow-two" />

      <header className="admin-login-header">
        <div className="brand">
          <div className="brand-mark">F&G</div>
          <span className="brand-name">
            fit<span>&</span>grit.
          </span>
        </div>

        <span className="trainer-portal-label">TRAINER PORTAL</span>
      </header>

      <section className="admin-login-shell">
        <div className="admin-login-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            COACH MODE
          </div>

          <h1 className="admin-title">
            Build the plan.
            <br />
            <em>They&apos;ll build the grit.</em>
          </h1>

          <p>
            Your clients, programs and progress —
            <br />
            all in one place.
          </p>
        </div>

        <div className="admin-login-card">
          <div className="admin-card-heading">
            <span className="admin-card-kicker">WELCOME BACK</span>
            <h2>Trainer sign in</h2>
            <p>Enter your credentials to access your workspace.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="admin-field">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="admin-field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="admin-login-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="admin-login-button"
              type="submit"
              disabled={loading || !email || !password}
            >
              <span>{loading ? "Signing in..." : "Enter workspace"}</span>
              <span className="arrow">{loading ? "···" : "→"}</span>
            </button>
          </form>

          <div className="admin-secure-note">
            <span>●</span>
            SECURE TRAINER ACCESS
          </div>
        </div>
      </section>

      <footer>
        <span>fit&grit © 2026</span>
        <span className="footer-message">built for showing up.</span>
      </footer>
    </main>
  );
}