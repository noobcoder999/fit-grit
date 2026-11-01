"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

type WorkoutRow = {
  workout: string;
  sets: string;
  reps: string;
};

type WorkoutOption = {
  id: string;
  name: string;
  trainer_id: string | null;
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

const setOptions = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
];

const repOptions = [
  "5",
  "6",
  "8",
  "10",
  "12",
  "15",
  "20",
  "25",
  "6-8",
  "8-10",
  "10-12",
  "12-15",
  "15-20",
  "AMRAP",
  "To failure",
];

export default function ClientWorkoutPage() {
  const params = useParams();
  const router = useRouter();

  const clientId = params.id as string;
  const supabase = createClient();

  const [trainerId, setTrainerId] = useState("");
  const [clientName, setClientName] = useState("");
  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan());

  const [workoutOptions, setWorkoutOptions] = useState<
    WorkoutOption[]
  >([]);

  const [showCustomWorkout, setShowCustomWorkout] =
    useState(false);

  const [customWorkoutName, setCustomWorkoutName] =
    useState("");

  const [addingWorkout, setAddingWorkout] =
    useState(false);

  const [customWorkoutMessage, setCustomWorkoutMessage] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadWorkoutLibrary() {
    const { data, error } = await supabase
      .from("workout_library")
      .select("id, name, trainer_id")
      .order("name");

    if (error) {
      console.error("Workout library error:", error);
      return;
    }

    setWorkoutOptions(data || []);
  }

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/admin");
        return;
      }

      setTrainerId(user.id);

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

      await loadWorkoutLibrary();

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

  async function addCustomWorkout() {
    const cleanName = customWorkoutName.trim();

    if (cleanName.length < 2) {
      setCustomWorkoutMessage(
        "Enter a workout name."
      );
      return;
    }

    if (!trainerId) return;

    const alreadyExists = workoutOptions.some(
      (workout) =>
        workout.name.toLowerCase() ===
        cleanName.toLowerCase()
    );

    if (alreadyExists) {
      setCustomWorkoutMessage(
        "That workout already exists."
      );
      return;
    }

    setAddingWorkout(true);
    setCustomWorkoutMessage("");

    const { error } = await supabase
      .from("workout_library")
      .insert({
        name: cleanName,
        trainer_id: trainerId,
      });

    if (error) {
      console.error(
        "Custom workout error:",
        error
      );

      setCustomWorkoutMessage(
        "Could not add workout."
      );

      setAddingWorkout(false);
      return;
    }

    await loadWorkoutLibrary();

    setCustomWorkoutName("");
    setCustomWorkoutMessage("Workout added.");
    setAddingWorkout(false);
  }

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
            {clientName}&apos;s
            <br />
            weekly plan
          </h1>
        </div>
      </header>

      <section className="trainer-workout-library">
        <div className="trainer-library-heading">
          <div>
            <span>YOUR LIBRARY</span>
            <h2>Need another workout?</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCustomWorkout(
                (current) => !current
              );

              setCustomWorkoutMessage("");
            }}
          >
            {showCustomWorkout
              ? "Close"
              : "+ Add workout"}
          </button>
        </div>

        {showCustomWorkout && (
          <div className="trainer-custom-workout-form">
            <input
              type="text"
              value={customWorkoutName}
              maxLength={80}
              placeholder="e.g. Landmine Press"
              onChange={(event) => {
                setCustomWorkoutName(
                  event.target.value
                );

                setCustomWorkoutMessage("");
              }}
            />

            <button
              type="button"
              onClick={addCustomWorkout}
              disabled={addingWorkout}
            >
              {addingWorkout
                ? "Adding..."
                : "Add"}
            </button>
          </div>
        )}

        {customWorkoutMessage && (
          <div className="trainer-library-message">
            {customWorkoutMessage}
          </div>
        )}

        <p>
          Custom workouts you add here are visible
          only to your trainer account.
        </p>
      </section>

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
                    <select
                      value={row.workout}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "workout",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select workout
                      </option>

                      <optgroup label="Gym workouts">
                        {workoutOptions
                          .filter(
                            (workout) =>
                              workout.trainer_id ===
                              null
                          )
                          .map((workout) => (
                            <option
                              key={workout.id}
                              value={workout.name}
                            >
                              {workout.name}
                            </option>
                          ))}
                      </optgroup>

                      {workoutOptions.some(
                        (workout) =>
                          workout.trainer_id !== null
                      ) && (
                        <optgroup label="My workouts">
                          {workoutOptions
                            .filter(
                              (workout) =>
                                workout.trainer_id !==
                                null
                            )
                            .map((workout) => (
                              <option
                                key={workout.id}
                                value={workout.name}
                              >
                                {workout.name}
                              </option>
                            ))}
                        </optgroup>
                      )}

                      {row.workout &&
                        !workoutOptions.some(
                          (workout) =>
                            workout.name ===
                            row.workout
                        ) && (
                          <option
                            value={row.workout}
                          >
                            {row.workout}
                          </option>
                        )}
                    </select>

                    <select
                      value={row.sets}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "sets",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Sets
                      </option>

                      {setOptions.map(
                        (sets) => (
                          <option
                            value={sets}
                            key={sets}
                          >
                            {sets}
                          </option>
                        )
                      )}

                      {row.sets &&
                        !setOptions.includes(
                          row.sets
                        ) && (
                          <option
                            value={row.sets}
                          >
                            {row.sets}
                          </option>
                        )}
                    </select>

                    <select
                      value={row.reps}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "reps",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Reps
                      </option>

                      {repOptions.map(
                        (reps) => (
                          <option
                            value={reps}
                            key={reps}
                          >
                            {reps}
                          </option>
                        )
                      )}

                      {row.reps &&
                        !repOptions.includes(
                          row.reps
                        ) && (
                          <option
                            value={row.reps}
                          >
                            {row.reps}
                          </option>
                        )}
                    </select>

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