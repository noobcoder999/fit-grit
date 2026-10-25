"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ActivatePage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pin, setPin] = useState("");
const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    const inviteCode = sessionStorage.getItem("fitgrit_invite_code");

    // Someone shouldn't normally land here without first
    // passing invite validation.
    if (!inviteCode) {
      router.replace("/");
      return;
    }

    setReady(true);
  }, [router]);

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setError("");

  const cleanName = name.trim();
  const numericAge = Number(age);
  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanName.length < 2) {
    setError("Tell us your name so we know what to call you.");
    return;
  }

  if (
    !Number.isInteger(numericAge) ||
    numericAge < 10 ||
    numericAge > 100
  ) {
    setError("Please enter a valid age.");
    return;
  }

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    setError("Please enter a valid Indian mobile number.");
    return;
  }

  if (!/^\d{6}$/.test(pin)) {
  setError("Choose a 6-digit PIN.");
  return;
}

if (pin !== confirmPin) {
  setError("Your PINs don't match.");
  return;
}

  const inviteCode =
    sessionStorage.getItem("fitgrit_invite_code");

  if (!inviteCode) {
    router.replace("/");
    return;
  }

  setSubmitting(true);

  try {
    const response = await fetch("/api/invites/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: inviteCode,
        name: cleanName,
        age: numericAge,
        phone: cleanPhone,
        pin,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setError(
        result.error ||
          "We couldn't finish setting up your account."
      );

      setSubmitting(false);
      return;
    }

    const { createClient } = await import(
      "../../utils/supabase/client"
    );

    const supabase = createClient();

    const { error: sessionError } =
      await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

    if (sessionError) {
      setError(
        "Your account was created, but we couldn't open it. Please try again."
      );

      setSubmitting(false);
      return;
    }

    sessionStorage.removeItem("fitgrit_invite_code");

    router.replace("/home");
    router.refresh();
  } catch {
    setError(
      "We couldn't connect right now. Please try again."
    );

    setSubmitting(false);
  }
}

  if (!ready) {
    return (
      <main className="activation-loading">
        <div className="loading-mark">F&G</div>
      </main>
    );
  }

  return (
    <main className="activation-page">
      <div className="activation-glow" />

      <header className="activation-header">
        <div className="brand">
          <div className="brand-mark">F&G</div>

          <span className="brand-name">
            fit<span>&</span>grit.
          </span>
        </div>

        <span className="activation-step">01 / 01</span>
      </header>

      <section className="activation-container">
        <div className="activation-progress">
          <span />
        </div>

        <div className="eyebrow">
          <span className="eyebrow-dot" />
          MAKE IT YOURS
        </div>

        <h1 className="activation-title">
          Tell us a little
          <br />
          about <em>you.</em>
        </h1>

        <p className="activation-intro">
          Nothing complicated. Just enough to make
          <br className="activation-desktop-break" />
          this space yours.
        </p>

        <form className="activation-form" onSubmit={handleSubmit}>
          <div className="activation-field">
            <label htmlFor="client-name">Your name</label>

            <input
              id="client-name"
              type="text"
              placeholder="What should we call you?"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              autoComplete="name"
              maxLength={60}
              required
            />
          </div>

          <div className="activation-row">
            <div className="activation-field age-field">
              <label htmlFor="client-age">Age</label>

              <input
                id="client-age"
                type="number"
                inputMode="numeric"
                placeholder="Age"
                value={age}
                onChange={(event) => {
                  setAge(event.target.value);
                  setError("");
                }}
                min={10}
                max={100}
                required
              />
            </div>

            <div className="activation-field phone-field">
              <label htmlFor="client-phone">Phone number</label>

              <div className="phone-input">
                <span>+91</span>

                <input
                  id="client-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(event) => {
                    const value = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);

                    setPhone(value);
                    setError("");
                  }}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          </div>

          <div className="activation-pin-section">
  <div className="activation-field">
    <label htmlFor="client-pin">Create a 6-digit PIN</label>

    <input
      id="client-pin"
      type="password"
      inputMode="numeric"
      placeholder="••••••"
      value={pin}
      onChange={(event) => {
        const value = event.target.value
          .replace(/\D/g, "")
          .slice(0, 6);

        setPin(value);
        setError("");
      }}
      maxLength={6}
      autoComplete="new-password"
      required
    />
  </div>

  <div className="activation-field">
    <label htmlFor="client-confirm-pin">Confirm PIN</label>

    <input
      id="client-confirm-pin"
      type="password"
      inputMode="numeric"
      placeholder="••••••"
      value={confirmPin}
      onChange={(event) => {
        const value = event.target.value
          .replace(/\D/g, "")
          .slice(0, 6);

        setConfirmPin(value);
        setError("");
      }}
      maxLength={6}
      autoComplete="new-password"
      required
    />
  </div>
</div>

          {error && (
            <div className="client-login-error" role="alert">
              {error}
            </div>
          )}

            <button
            className="activation-button"
            type="submit"
            disabled={
                submitting ||
                !name.trim() ||
                !age ||
                phone.length !== 10 ||
                pin.length !== 6 ||
                confirmPin.length !== 6
              }
            >
            <span>
            {submitting ? "Setting things up..." : "Start my journey"}
            </span>

            <span className="arrow">
            {submitting ? "···" : "→"}
            </span>
          </button>
        </form>

        <div className="activation-note">
          <span>●</span>
          YOUR DETAILS STAY PRIVATE
        </div>
      </section>

      <footer>
        <span>fit&grit © 2026</span>
        <span className="footer-message">built for showing up.</span>
      </footer>
    </main>
  );
}