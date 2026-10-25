"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/invites/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: normalizedCode,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.valid) {
        setError(result.message || "That invite code isn't valid.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("fitgrit_invite_code", normalizedCode);

      router.push("/activate");
    } catch {
      setError("We couldn't connect right now. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="brand">
        <div className="brand-mark">F&G</div>

        <span className="brand-name">
          fit<span>&</span>grit.
        </span>
      </header>

      <section className="login-container">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          WELCOME TO FIT&GRIT
        </div>

        <h1>
          This is where
          <br />
          you <em>begin.</em>
        </h1>

        <p className="intro">
          Your training. Your progress. Your pace.
          <br />
          We&apos;ll take it from here.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="invite-code">Your invite code</label>

          <div className="input-wrap">
            <input
              id="invite-code"
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError("");
              }}
              placeholder="FG-XXXXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
            />
          </div>

          {error && (
            <div className="client-login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!code.trim() || loading}
          >
            <span>{loading ? "Checking..." : "Continue"}</span>
            <span className="arrow">{loading ? "···" : "→"}</span>
          </button>
        </form>

        <div className="welcome-help">
          <p className="help-text">
            New here? Your trainer will send you an invite code.
          </p>

          <button
            type="button"
            className="existing-client-login"
            onClick={() => router.push("/login")}
          >
            Already have an account? Log in
          </button>
        </div>
      </section>

      <footer>
        <span>fit&grit © 2026</span>
        <span className="footer-message">built for showing up.</span>
      </footer>
    </main>
  );
}