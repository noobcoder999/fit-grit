"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type AttendanceRow = {
  workout_date: string;
};

type NoteRow = {
  note: string;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [clientId, setClientId] = useState("");

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [attendance, setAttendance] = useState<Set<string>>(
    new Set()
  );

  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [updatingAttendance, setUpdatingAttendance] =
    useState(false);

  const [savingNote, setSavingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");

  useEffect(() => {
    async function loadCalendar() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "client"
      ) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setClientId(user.id);

      const { data: attendanceRows, error: attendanceError } =
        await supabase
          .from("client_workout_attendance")
          .select("workout_date")
          .eq("client_id", user.id);

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

    loadCalendar();
  }, [router, supabase]);

  useEffect(() => {
    async function loadNote() {
      if (!clientId || !selectedDate) return;

      setNoteMessage("");

      const { data, error } = await supabase
        .from("client_private_notes")
        .select("note")
        .eq("client_id", clientId)
        .eq("note_date", selectedDate)
        .maybeSingle();

      if (error) {
        console.error("Note load error:", error);
        return;
      }

      setNote((data as NoteRow | null)?.note || "");
    }

    loadNote();
  }, [clientId, selectedDate, supabase]);

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

  async function toggleWorkout() {
    if (!clientId || !selectedDate) return;

    if (selectedDate > todayKey) return;

    setUpdatingAttendance(true);

    const alreadyMarked =
      attendance.has(selectedDate);

    if (alreadyMarked) {
      const { error } = await supabase
        .from("client_workout_attendance")
        .delete()
        .eq("client_id", clientId)
        .eq("workout_date", selectedDate);

      if (error) {
        console.error(
          "Attendance delete error:",
          error
        );

        setUpdatingAttendance(false);
        return;
      }

      setAttendance((current) => {
        const updated = new Set(current);
        updated.delete(selectedDate);
        return updated;
      });

      setUpdatingAttendance(false);
      return;
    }

    const { error } = await supabase
      .from("client_workout_attendance")
      .insert({
        client_id: clientId,
        workout_date: selectedDate,
      });

    if (error) {
      console.error(
        "Attendance insert error:",
        error
      );

      setUpdatingAttendance(false);
      return;
    }

    setAttendance((current) => {
      const updated = new Set(current);
      updated.add(selectedDate);
      return updated;
    });

    setUpdatingAttendance(false);
  }

  async function saveNote() {
    if (!clientId || !selectedDate) return;

    setSavingNote(true);
    setNoteMessage("");

    const cleanNote = note.trim();

    if (cleanNote === "") {
      const { error } = await supabase
        .from("client_private_notes")
        .delete()
        .eq("client_id", clientId)
        .eq("note_date", selectedDate);

      if (error) {
        console.error(
          "Note delete error:",
          error
        );

        setNoteMessage("Could not save note.");
        setSavingNote(false);
        return;
      }

      setNote("");
      setNoteMessage("Note cleared.");
      setSavingNote(false);
      return;
    }

    const { error } = await supabase
      .from("client_private_notes")
      .upsert(
        {
          client_id: clientId,
          note_date: selectedDate,
          note: cleanNote,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "client_id,note_date",
        }
      );

    if (error) {
      console.error("Note save error:", error);

      setNoteMessage("Could not save note.");
      setSavingNote(false);
      return;
    }

    setNote(cleanNote);
    setNoteMessage("Note saved.");
    setSavingNote(false);
  }

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
      <main className="client-calendar-loading">
        Loading calendar...
      </main>
    );
  }

  const monthLabel =
    currentMonth.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

  const selectedLabel = new Date(
    `${selectedDate}T00:00:00`
  ).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const selectedIsFuture =
    selectedDate > todayKey;

  const selectedIsCompleted =
    attendance.has(selectedDate);

  return (
    <main className="client-calendar-page">
      <header className="client-calendar-header">
        <button
          type="button"
          className="client-workout-back"
          onClick={() => router.push("/home")}
        >
          ←
        </button>

        <div className="client-calendar-eyebrow">
          YOUR CONSISTENCY
        </div>

        <h1>
          Show up.
          <br />
          <em>Mark it.</em>
        </h1>

        <p>
          Choose a date, then mark whether you worked out.
        </p>
      </header>

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

            const isSelected =
              selectedDate === dateKey;

            const isFuture =
              dateKey > todayKey;

            const isToday =
              dateKey === todayKey;

            return (
              <button
                type="button"
                key={dateKey}
                className={[
                  "calendar-day",
                  isMarked ? "worked-out" : "",
                  isSelected ? "selected" : "",
                  isFuture ? "future" : "",
                  isToday ? "today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  setSelectedDate(dateKey)
                }
              >
                <span>{date.getDate()}</span>

                {isMarked && (
                  <small>✓</small>
                )}
              </button>
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

      <section className="calendar-selected-card">
        <div className="calendar-selected-heading">
          <div>
            <span>SELECTED DAY</span>
            <h2>{selectedLabel}</h2>
          </div>

          {selectedIsCompleted && (
            <div className="calendar-complete-pill">
              ✓ Completed
            </div>
          )}
        </div>

        {selectedIsFuture ? (
          <div className="calendar-future-message">
            Future dates can&apos;t be marked yet.
          </div>
        ) : (
          <button
            type="button"
            className={
              selectedIsCompleted
                ? "calendar-workout-button completed"
                : "calendar-workout-button"
            }
            onClick={toggleWorkout}
            disabled={updatingAttendance}
          >
            <span>
              {selectedIsCompleted
                ? "✓ Workout completed"
                : "Mark workout complete"}
            </span>

            <span>
              {selectedIsCompleted
                ? "Remove"
                : "＋"}
            </span>
          </button>
        )}
      </section>

      <section className="calendar-notes-card">
        <div className="calendar-note-heading">
          <div>
            <span>PRIVATE NOTE</span>
            <h2>{selectedLabel}</h2>
          </div>

          <span className="private-pill">
            Only you
          </span>
        </div>

        <p className="calendar-note-helper">
          Anything you want to remember about this day.
        </p>

        <textarea
          value={note}
          maxLength={600}
          placeholder="How did you feel? Any progress, pain, or something worth remembering?"
          onChange={(event) => {
            setNote(event.target.value);
            setNoteMessage("");
          }}
        />

        <div className="calendar-note-footer">
          <span>{note.length}/600</span>

          <button
            type="button"
            onClick={saveNote}
            disabled={savingNote}
          >
            {savingNote
              ? "Saving..."
              : "Save note"}
          </button>
        </div>

        {noteMessage && (
          <div className="calendar-note-message">
            {noteMessage}
          </div>
        )}
      </section>
    </main>
  );
}