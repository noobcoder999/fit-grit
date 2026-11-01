"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";

type Client = {
  id: string;
  full_name: string | null;
  phone: string | null;
  age: number | null;
  created_at: string;
};

type Membership = {
  client_id: string;
  membership_start_date: string;
  membership_end_date: string;
};

const durationOptions = [
  { label: "1 month", months: 1 },
  { label: "2 months", months: 2 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
];

function todayKey() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  return new Date(dateValue).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/*
  Adds months safely.

  Example:
  31 Jan + 1 month
  becomes the last valid day of February
  instead of accidentally jumping into March.
*/
function addMonthsToDate(
  dateValue: string,
  monthsToAdd: number
) {
  const [year, month, day] = dateValue
    .split("-")
    .map(Number);

  const targetMonthIndex =
    month - 1 + monthsToAdd;

  const targetYear =
    year + Math.floor(targetMonthIndex / 12);

  const normalizedMonth =
    ((targetMonthIndex % 12) + 12) % 12;

  const lastDayOfTargetMonth =
    new Date(
      targetYear,
      normalizedMonth + 1,
      0
    ).getDate();

  const safeDay = Math.min(
    day,
    lastDayOfTargetMonth
  );

  const result = new Date(
    targetYear,
    normalizedMonth,
    safeDay
  );

  const resultYear = result.getFullYear();

  const resultMonth = String(
    result.getMonth() + 1
  ).padStart(2, "0");

  const resultDay = String(
    result.getDate()
  ).padStart(2, "0");

  return `${resultYear}-${resultMonth}-${resultDay}`;
}

function getDaysRemaining(endDate: string) {
  const today = new Date(
    `${todayKey()}T00:00:00`
  );

  const expiry = new Date(
    `${endDate}T00:00:00`
  );

  const difference =
    expiry.getTime() - today.getTime();

  return Math.max(
    0,
    Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    )
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] =
    useState<Client[]>([]);

  const [memberships, setMemberships] =
    useState<Record<string, Membership>>({});

  const [startDates, setStartDates] =
    useState<Record<string, string>>({});

  const [durations, setDurations] =
    useState<Record<string, number>>({});

  const [extendDurations, setExtendDurations] =
    useState<Record<string, number>>({});

  const [savingClient, setSavingClient] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

    const [membershipClient, setMembershipClient] =
  useState<Client | null>(null);

  useEffect(() => {
    async function loadClients() {
      // 1. Check who is logged in
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/admin");
        return;
      }

      // 2. Make sure it is a trainer
      const {
        data: ownProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !ownProfile ||
        ownProfile.role !== "admin"
      ) {
        await supabase.auth.signOut();

        router.replace("/admin");
        return;
      }

      // 3. Load only this trainer's clients.
      // Supabase RLS filters other trainers' clients.
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, age, created_at"
        )
        .eq("role", "client")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Client load error:",
          error
        );

        setLoading(false);
        return;
      }

      const loadedClients =
        (data || []) as Client[];

      setClients(loadedClients);

      /*
        Load memberships.
        RLS again ensures the trainer only sees
        memberships belonging to their clients.
      */
      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("client_memberships")
        .select(
          "client_id, membership_start_date, membership_end_date"
        );

      if (membershipError) {
        console.error(
          "Membership load error:",
          membershipError
        );
      }

      const membershipMap:
        Record<string, Membership> = {};

      (
        (membershipData || []) as Membership[]
      ).forEach((membership) => {
        membershipMap[
          membership.client_id
        ] = membership;
      });

      setMemberships(membershipMap);

      /*
        Give every new client sensible defaults:
        Start = today
        Duration = 1 month
        Extend = 1 month
      */
      const defaultStarts:
        Record<string, string> = {};

      const defaultDurations:
        Record<string, number> = {};

      const defaultExtensions:
        Record<string, number> = {};

      loadedClients.forEach((client) => {
        defaultStarts[client.id] =
          todayKey();

        defaultDurations[client.id] = 1;
        defaultExtensions[client.id] = 1;
      });

      setStartDates(defaultStarts);
      setDurations(defaultDurations);
      setExtendDurations(
        defaultExtensions
      );

      setLoading(false);
    }

    loadClients();
  }, [router, supabase]);

  async function startMembership(
    clientId: string
  ) {
    const startDate =
      startDates[clientId] ||
      todayKey();

    const months =
      durations[clientId] || 1;

    const endDate =
      addMonthsToDate(
        startDate,
        months
      );

    setSavingClient(clientId);

    setMessage((current) => ({
      ...current,
      [clientId]: "",
    }));

    const {
      data,
      error,
    } = await supabase
      .from("client_memberships")
      .insert({
        client_id: clientId,
        membership_start_date:
          startDate,
        membership_end_date:
          endDate,
      })
      .select(
        "client_id, membership_start_date, membership_end_date"
      )
      .single();

    if (error) {
      console.error(
        "Membership creation error:",
        error
      );

      setMessage((current) => ({
        ...current,
        [clientId]:
          "Could not start membership.",
      }));

      setSavingClient(null);
      return;
    }

    setMemberships((current) => ({
      ...current,
      [clientId]:
        data as Membership,
    }));

    setMessage((current) => ({
      ...current,
      [clientId]:
        "Membership started.",
    }));

    setSavingClient(null);
  }

  async function extendMembership(
    clientId: string
  ) {
    const membership =
      memberships[clientId];

    if (!membership) return;

    const months =
      extendDurations[clientId] || 1;

    const today = todayKey();

    /*
      If membership is still active:
      extend from existing expiry.

      If already expired:
      extend from today.
    */
    const extensionBase =
      membership.membership_end_date >=
      today
        ? membership.membership_end_date
        : today;

    const newEndDate =
      addMonthsToDate(
        extensionBase,
        months
      );

    setSavingClient(clientId);

    setMessage((current) => ({
      ...current,
      [clientId]: "",
    }));

    const {
      data,
      error,
    } = await supabase
      .from("client_memberships")
      .update({
        membership_end_date:
          newEndDate,

        updated_at:
          new Date().toISOString(),
      })
      .eq("client_id", clientId)
      .select(
        "client_id, membership_start_date, membership_end_date"
      )
      .single();

    if (error) {
      console.error(
        "Membership extension error:",
        error
      );

      setMessage((current) => ({
        ...current,
        [clientId]:
          "Could not extend membership.",
      }));

      setSavingClient(null);
      return;
    }

    setMemberships((current) => ({
      ...current,
      [clientId]:
        data as Membership,
    }));

    setMessage((current) => ({
      ...current,
      [clientId]:
        "Membership extended.",
    }));

    setSavingClient(null);
  }

  if (loading) {
    return (
      <main className="admin-clients-loading">
        Loading clients...
      </main>
    );
  }

  return (
    <main className="admin-clients-page">
      <header className="admin-clients-header">
        <button
          type="button"
          className="admin-clients-back"
          onClick={() =>
            router.push(
              "/admin/dashboard"
            )
          }
        >
          ←
        </button>

        <div className="admin-clients-eyebrow">
          TRAINER PORTAL
        </div>

        <h1>
          Your
          <br />
          <em>clients.</em>
        </h1>

        <p>
          Everyone training with you,
          in one place.
        </p>
      </header>

      <section className="admin-client-list">
        {clients.length === 0 ? (
          <div className="admin-no-clients">
            <span>
              No clients yet.
            </span>

            <p>
              Once someone activates one
              of your invite codes,
              they&apos;ll appear here.
            </p>
          </div>
        ) : (
          clients.map((client) => {
            const name =
              client.full_name?.trim() ||
              "Client";

            const initial =
              name.charAt(0).toUpperCase();

            const membership =
              memberships[client.id];

            const remaining =
              membership
                ? getDaysRemaining(
                    membership
                      .membership_end_date
                  )
                : null;

            const expired =
              membership
                ? membership
                    .membership_end_date <
                  todayKey()
                : false;

            return (
              <article
                className="admin-client-card admin-client-card-expanded"
                key={client.id}
              >

              <div className="admin-client-top">
                <div className="admin-client-main">
                  <div className="admin-client-avatar">
                    {initial}
                  </div>

                  <div>
                    <h2>{name}</h2>

                    <div className="admin-client-meta">
                      {client.age
                        ? `${client.age} yrs`
                        : "Age not set"}

                      <span>·</span>

                      {client.phone || "No phone"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-membership-open"
                  onClick={() =>
                    setMembershipClient(client)
                  }
                >
                  <div>
                    <span>MEMBERSHIP</span>

                    <strong>
                      {membership
                        ? expired
                          ? "Expired"
                          : `${remaining} days`
                        : "Not started"}
                    </strong>
                  </div>

                  <span className="admin-membership-open-arrow">
                    →
                  </span>
                </button>
              </div>

                {/* =========================
                    CLIENT ACTIONS
                   ========================= */}

                <div className="admin-client-actions">
                  <button
                    type="button"
                    className="admin-open-client"
                    onClick={() =>
                      router.push(
                        `/admin/clients/${client.id}/workout`
                      )
                    }
                  >
                    Workout plan
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    className="admin-open-client admin-open-client-secondary"
                    onClick={() =>
                      router.push(
                        `/admin/clients/${client.id}/diet`
                      )
                    }
                  >
                    Diet plan
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    className="admin-open-client admin-open-client-secondary"
                    onClick={() =>
                      router.push(
                        `/admin/clients/${client.id}/attendance`
                      )
                    }
                  >
                    Attendance
                    <span>→</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
      {membershipClient && (() => {
  const client =
    membershipClient;

  const membership =
    memberships[client.id];

  const remaining =
    membership
      ? getDaysRemaining(
          membership.membership_end_date
        )
      : null;

  const expired =
    membership
      ? membership.membership_end_date <
        todayKey()
      : false;

  const name =
    client.full_name?.trim() ||
    "Client";

  return (
    <div
      className="membership-modal-backdrop"
      onClick={() =>
        setMembershipClient(null)
      }
    >
      <div
        className="membership-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="membership-modal-header">
          <div>
            <span>MEMBERSHIP</span>

            <h2>{name}</h2>
          </div>

          <button
            type="button"
            className="membership-modal-close"
            onClick={() =>
              setMembershipClient(null)
            }
          >
            ×
          </button>
        </div>

        <div className="membership-modal-joined">
          <span>JOINED FIT&GRIT</span>

          <strong>
            {formatJoinedDate(
              client.created_at
            )}
          </strong>
        </div>

        {!membership ? (
          <>
            <div className="membership-modal-fields">
              <label>
                <span>
                  MEMBERSHIP START DATE
                </span>

                <input
                  type="date"
                  value={
                    startDates[
                      client.id
                    ] || todayKey()
                  }
                  onChange={(event) =>
                    setStartDates(
                      (current) => ({
                        ...current,
                        [client.id]:
                          event.target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>
                  MEMBERSHIP PERIOD
                </span>

                <select
                  value={
                    durations[
                      client.id
                    ] || 1
                  }
                  onChange={(event) =>
                    setDurations(
                      (current) => ({
                        ...current,
                        [client.id]:
                          Number(
                            event.target
                              .value
                          ),
                      })
                    )
                  }
                >
                  {durationOptions.map(
                    (option) => (
                      <option
                        key={
                          option.months
                        }
                        value={
                          option.months
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <button
              type="button"
              className="membership-modal-primary"
              onClick={() =>
                startMembership(
                  client.id
                )
              }
              disabled={
                savingClient ===
                client.id
              }
            >
              {savingClient ===
              client.id
                ? "Starting..."
                : "Start membership"}
            </button>
          </>
        ) : (
          <>
            <div className="membership-modal-status-row">
              <div>
                <span>STATUS</span>

                <strong
                  className={
                    expired
                      ? "membership-modal-expired"
                      : "membership-modal-active"
                  }
                >
                  {expired
                    ? "Expired"
                    : "Active"}
                </strong>
              </div>

              <div>
                <span>
                  DAYS REMAINING
                </span>

                <strong>
                  {expired
                    ? "0"
                    : remaining}
                </strong>
              </div>
            </div>

            <div className="membership-modal-dates">
              <div>
                <span>
                  MEMBERSHIP STARTED
                </span>

                <strong>
                  {formatDate(
                    membership
                      .membership_start_date
                  )}
                </strong>
              </div>

              <div>
                <span>
                  VALID UNTIL
                </span>

                <strong>
                  {formatDate(
                    membership
                      .membership_end_date
                  )}
                </strong>
              </div>
            </div>

            <div className="membership-modal-extension">
              <label>
                <span>
                  EXTEND MEMBERSHIP
                </span>

                <select
                  value={
                    extendDurations[
                      client.id
                    ] || 1
                  }
                  onChange={(event) =>
                    setExtendDurations(
                      (current) => ({
                        ...current,
                        [client.id]:
                          Number(
                            event.target
                              .value
                          ),
                      })
                    )
                  }
                >
                  {durationOptions.map(
                    (option) => (
                      <option
                        key={
                          option.months
                        }
                        value={
                          option.months
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <button
                type="button"
                onClick={() =>
                  extendMembership(
                    client.id
                  )
                }
                disabled={
                  savingClient ===
                  client.id
                }
              >
                {savingClient ===
                client.id
                  ? "Updating..."
                  : "Extend membership"}
              </button>
            </div>
          </>
        )}

        {message[client.id] && (
          <div className="membership-modal-message">
            {message[client.id]}
          </div>
        )}
      </div>
    </div>
  );
})()}
    </main>
  );
}