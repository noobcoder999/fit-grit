"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export default function ClientLoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanPhone = phone.replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid mobile number.");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setError("Please enter your 6-digit PIN.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/client-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: cleanPhone,
          pin,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          result.error || "Phone number or PIN is incorrect."
        );

        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { error: sessionError } =
        await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });

      if (sessionError) {
        setError(
          "Login worked, but we couldn't open your account."
        );

        setLoading(false);
        return;
      }

      router.replace("/home");
      router.refresh();
    } catch {
      setError("We couldn't connect right now. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="client-login-page">
      <div className="client-login-glow" />

      <header className="brand">
        <div className="brand-mark">F&G</div>

        <span className="brand-name">
          fit<span>&</span>grit.
        </span>
      </header>

      <section className="client-login-container">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          WELCOME BACK
        </div>

        <h1 className="client-login-title">
          Pick up where
          <br />
          you <em>left off.</em>
        </h1>

        <p className="client-login-intro">
          Your plan is waiting.
        </p>

        <form
          className="client-returning-form"
          onSubmit={handleSubmit}
        >
          <div className="activation-field">
            <label htmlFor="login-phone">
              Phone number
            </label>

            <div className="phone-input">
              <span>+91</span>

              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                onChange={(event) => {
                  setPhone(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  );

                  setError("");
                }}
                maxLength={10}
              />
            </div>
          </div>

          <div className="activation-field client-pin-login">
            <label htmlFor="login-pin">
              6-digit PIN
            </label>

            <input
              id="login-pin"
              type="password"
              inputMode="numeric"
              placeholder="••••••"
              value={pin}
              onChange={(event) => {
                setPin(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                );

                setError("");
              }}
              maxLength={6}
            />
          </div>

          {error && (
            <div className="client-login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="activation-button"
            disabled={
              loading ||
              phone.length !== 10 ||
              pin.length !== 6
            }
          >
            <span>
              {loading ? "Logging in..." : "Log in"}
            </span>

            <span className="arrow">
              {loading ? "···" : "→"}
            </span>
          </button>
        </form>

        <button
          type="button"
          className="client-back-to-invite"
          onClick={() => router.push("/")}
        >
          New here? Use an invite code
        </button>
      </section>
    </main>
  );
}