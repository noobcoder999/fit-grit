"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

type AttendanceRow = {
  workout_date: string;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ClientAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const clientId = params.id as string;

  const today = useMemo(() => new Date(), []);

  const [clientName, setClientName] = useState("");
  const [attendance, setAttendance] = useState<Set<string>>(
    new Set()
  );
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/admin");
        return;
      }

      const { data: trainerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        !trainerProfile ||
        trainerProfile.role !== "admin"
      ) {
        await supabase.auth.signOut();
        router.replace("/admin");
        return;
      }

      const {
        data: profile,
        error: clientError,
      } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", clientId)
        .eq("role", "client")
        .maybeSingle();

      if (clientError || !profile) {
        router.replace("/admin/clients");
        return;
      }

      setClientName(profile.full_name || "Client");

      const {
        data: attendanceRows,
        error: attendanceError,
      } = await supabase
        .from("client_workout_attendance")
        .select("workout_date")
        .eq("client_id", clientId);

      if (attendanceError) {
        console.error(
          "Attendance load error:",
          attendanceError
        );
      }

      const dates = new Set(
        ((attendanceRows || []) as AttendanceRow[]).map(
          (row) => row.workout_date
        )
      );

      setAttendance(dates);
      setLoading(false);
    }

    loadAttendance();
  }, [clientId, router, supabase]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const cells: Array<Date | null> = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      cells.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentMonth]);

  function previousMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() - 1,
          1
        )
    );
  }

  function nextMonth() {
    setCurrentMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          1
        )
    );
  }

  if (loading) {
    return (
      <main className="trainer-workout-loading">
        Loading attendance...
      </main>
    );
  }

  const monthLabel =
    currentMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

  const completedThisMonth = Array.from(
    attendance
  ).filter((dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);

    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
  }).length;

  return (
    <main className="trainer-attendance-page">
      <header className="trainer-attendance-header">
        <button
          type="button"
          className="admin-clients-back"
          onClick={() =>
            router.push("/admin/clients")
          }
        >
          ←
        </button>

        <div className="trainer-workout-eyebrow">
          CLIENT ATTENDANCE
        </div>

        <h1>
          {clientName}&apos;s
          <br />
          <em>consistency.</em>
        </h1>

        <p>
          Green days are workouts marked complete by the client.
        </p>
      </header>

      <section className="trainer-attendance-summary">
        <div>
          <span>THIS MONTH</span>
          <strong>{completedThisMonth}</strong>
          <p>workouts completed</p>
        </div>

        <div>
          <span>TODAY</span>
          <strong>
            {attendance.has(toDateKey(today))
              ? "✓"
              : "—"}
          </strong>
          <p>
            {attendance.has(toDateKey(today))
              ? "worked out"
              : "not marked"}
          </p>
        </div>
      </section>

      <section className="calendar-card">
        <div className="calendar-month-header">
          <button
            type="button"
            onClick={previousMonth}
          >
            ←
          </button>

          <strong>{monthLabel}</strong>

          <button
            type="button"
            onClick={nextMonth}
          >
            →
          </button>
        </div>

        <div className="calendar-weekdays">
          <span>S</span>
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
        </div>

        <div className="calendar-grid">
          {calendarDays.map((date, index) => {
            if (!date) {
              return (
                <div
                  className="calendar-empty-cell"
                  key={`empty-${index}`}
                />
              );
            }

            const dateKey = toDateKey(date);
            const isMarked =
              attendance.has(dateKey);
            const isToday =
              dateKey === toDateKey(today);

            return (
              <div
                key={dateKey}
                className={[
                  "calendar-day",
                  isMarked ? "worked-out" : "",
                  isToday ? "today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>{date.getDate()}</span>

                {isMarked && (
                  <small>✓</small>
                )}
              </div>
            );
          })}
        </div>

        <div className="calendar-legend">
          <span>
            <i className="legend-workout" />
            Workout complete
          </span>

          <span>
            <i className="legend-today" />
            Today
          </span>
        </div>
      </section>
    </main>
  );
}