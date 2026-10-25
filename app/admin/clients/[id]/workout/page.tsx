"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

type WorkoutRow = {
  workout: string;
  sets: string;
  reps: string;
};

type WeeklyPlan = {
  monday: WorkoutRow[];
  tuesday: WorkoutRow[];
  wednesday: WorkoutRow[];
  thursday: WorkoutRow[];
  friday: WorkoutRow[];
  saturday: WorkoutRow[];
  sunday: WorkoutRow[];
};

const emptyRow = (): WorkoutRow => ({
  workout: "",
  sets: "",
  reps: "",
});

const emptyPlan = (): WeeklyPlan => ({
  monday: [emptyRow()],
  tuesday: [emptyRow()],
  wednesday: [emptyRow()],
  thursday: [emptyRow()],
  friday: [emptyRow()],
  saturday: [emptyRow()],
  sunday: [emptyRow()],
});

const days: Array<keyof WeeklyPlan> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function ClientWorkoutPage() {
  const params = useParams();
  const router = useRouter();

  const clientId = params.id as string;

  const supabase = createClient();

  const [clientName, setClientName] = useState("");
  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      // ---------------------------------------------------
      // 1. Check who is logged in
      // ---------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/admin");
        return;
      }

      // ---------------------------------------------------
      // 2. Make sure logged-in user is actually a trainer
      // ---------------------------------------------------

      const {
        data: trainerProfile,
        error: trainerError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        trainerError ||
        !trainerProfile ||
        trainerProfile.role !== "admin"
      ) {
        await supabase.auth.signOut();

        router.replace("/admin");
        return;
      }

      // ---------------------------------------------------
      // 3. Load requested client
      //
      // Our Supabase RLS already makes sure the trainer
      // can only read clients belonging to THEIR invites.
      // ---------------------------------------------------

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

      if (profile.full_name) {
        setClientName(profile.full_name);
      }

      // ---------------------------------------------------
      // 4. Load this client's weekly workout plan
      // ---------------------------------------------------

      const {
        data: existingPlan,
        error: planError,
      } = await supabase
        .from("client_weekly_plans")
        .select("plan_data")
        .eq("client_id", clientId)
        .maybeSingle();

      if (planError) {
        console.error(
          "Could not load workout plan:",
          planError
        );
      }

      if (existingPlan?.plan_data) {
        const loadedPlan =
          existingPlan.plan_data as WeeklyPlan;

        const normalizedPlan = {
          ...loadedPlan,
        };

        days.forEach((day) => {
          if (
            !normalizedPlan[day] ||
            normalizedPlan[day].length === 0
          ) {
            normalizedPlan[day] = [emptyRow()];
          }
        });

        setPlan(normalizedPlan);
      }

      setLoading(false);
    }

    loadData();
  }, [clientId, router, supabase]);

  function updateRow(
    day: keyof WeeklyPlan,
    index: number,
    field: keyof WorkoutRow,
    value: string
  ) {
    setPlan((current) => {
      const updatedRows = [...current[day]];

      updatedRows[index] = {
        ...updatedRows[index],
        [field]: value,
      };

      return {
        ...current,
        [day]: updatedRows,
      };
    });

    setMessage("");
  }

  function addRow(day: keyof WeeklyPlan) {
    setPlan((current) => ({
      ...current,
      [day]: [...current[day], emptyRow()],
    }));

    setMessage("");
  }

  function removeRow(
    day: keyof WeeklyPlan,
    index: number
  ) {
    setPlan((current) => {
      const updatedRows = current[day].filter(
        (_, rowIndex) => rowIndex !== index
      );

      return {
        ...current,
        [day]:
          updatedRows.length > 0
            ? updatedRows
            : [emptyRow()],
      };
    });

    setMessage("");
  }

  async function savePlan() {
    setSaving(true);
    setMessage("");

    const cleanedPlan = {} as WeeklyPlan;

    days.forEach((day) => {
      cleanedPlan[day] = plan[day]
        .map((row) => ({
          workout: row.workout.trim(),
          sets: row.sets.trim(),
          reps: row.reps.trim(),
        }))
        .filter((row) => row.workout !== "");
    });

    const { error } = await supabase
      .from("client_weekly_plans")
      .upsert(
        {
          client_id: clientId,
          plan_data: cleanedPlan,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "client_id",
        }
      );

    if (error) {
      console.error(
        "Workout save error:",
        error
      );

      setMessage(
        "Something went wrong while saving."
      );

      setSaving(false);
      return;
    }

    const displayPlan = {
      ...cleanedPlan,
    };

    days.forEach((day) => {
      if (displayPlan[day].length === 0) {
        displayPlan[day] = [emptyRow()];
      }
    });

    setPlan(displayPlan);

    setMessage("Weekly plan saved.");

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="trainer-workout-loading">
        Loading plan...
      </main>
    );
  }

  return (
    <main className="trainer-workout-page">
      <header className="trainer-workout-header">
        <button
          type="button"
          className="admin-clients-back"
          onClick={() =>
            router.push("/admin/clients")
          }
        >
          ←
        </button>

        <div>
          <div className="trainer-workout-eyebrow">
            CLIENT WORKOUT
          </div>

          <h1>
            {clientName || "Client"}&apos;s
            <br />
            weekly plan
          </h1>
        </div>
      </header>

      <section className="trainer-workout-days">
        {days.map((day) => (
          <div
            className="trainer-day-card"
            key={day}
          >
            <div className="trainer-day-heading">
              {day.toUpperCase()}
            </div>

            <div className="trainer-column-labels">
              <span>Workout</span>
              <span>Sets</span>
              <span>Reps</span>
              <span />
            </div>

            <div className="trainer-day-rows">
              {plan[day].map(
                (row, index) => (
                  <div
                    className="trainer-workout-row"
                    key={index}
                  >
                    <input
                      type="text"
                      placeholder="Workout"
                      value={row.workout}
                      maxLength={80}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "workout",
                          event.target.value
                        )
                      }
                    />

                    <input
                      type="text"
                      placeholder="Sets"
                      value={row.sets}
                      maxLength={20}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "sets",
                          event.target.value
                        )
                      }
                    />

                    <input
                      type="text"
                      placeholder="Reps"
                      value={row.reps}
                      maxLength={30}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "reps",
                          event.target.value
                        )
                      }
                    />

                    <div className="trainer-row-actions">
                      {index <
                        plan[day].length -
                          1 && (
                        <button
                          type="button"
                          className="trainer-delete-row"
                          onClick={() =>
                            removeRow(
                              day,
                              index
                            )
                          }
                        >
                          ×
                        </button>
                      )}

                      {index ===
                        plan[day].length -
                          1 && (
                        <button
                          type="button"
                          className="trainer-add-row"
                          onClick={() =>
                            addRow(day)
                          }
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="trainer-workout-save-area">
        {message && (
          <div className="trainer-save-message">
            {message}
          </div>
        )}

        <button
          type="button"
          className="trainer-save-plan"
          onClick={savePlan}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save weekly plan"}
        </button>
      </div>
    </main>
  );
}