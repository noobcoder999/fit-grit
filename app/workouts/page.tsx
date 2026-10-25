"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

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

const days: Array<keyof WeeklyPlan> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const emptyPlan: WeeklyPlan = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

export default function WorkoutsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [plan, setPlan] = useState<WeeklyPlan>(emptyPlan);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkoutPlan() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

      if (
        profileError ||
        !profile ||
        profile.role !== "client"
      ) {
        router.replace("/");
        return;
      }

      setClientName(profile.full_name || "");

      const { data: workoutPlan } = await supabase
        .from("client_weekly_plans")
        .select("plan_data")
        .eq("client_id", user.id)
        .maybeSingle();

      if (workoutPlan?.plan_data) {
        setPlan(workoutPlan.plan_data as WeeklyPlan);
      }

      setLoading(false);
    }

    loadWorkoutPlan();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="client-workout-loading">
        Loading your plan...
      </main>
    );
  }

  const firstName =
    clientName.trim().split(/\s+/)[0] || "there";

  return (
    <main className="client-workout-page">
      <header className="client-workout-header">
        <button
          className="client-workout-back"
          type="button"
          onClick={() => router.push("/home")}
        >
          ←
        </button>

        <div>
          <div className="client-workout-eyebrow">
            YOUR TRAINING
          </div>

          <h1>
            Weekly
            <br />
            <em>workout plan.</em>
          </h1>

          <p>
            Here&apos;s what&apos;s lined up for you,
            {" "}
            {firstName}.
          </p>
        </div>
      </header>

      <section className="client-weekly-plan">
        {days.map((day) => {
          const workouts = plan[day] || [];

          return (
            <div
              className="client-workout-day"
              key={day}
            >
              <div className="client-workout-day-title">
                <span>{day.toUpperCase()}</span>

                <span className="client-workout-count">
                  {workouts.length > 0
                    ? `${workouts.length} ${
                        workouts.length === 1
                          ? "WORKOUT"
                          : "WORKOUTS"
                      }`
                    : "REST"}
                </span>
              </div>

              {workouts.length === 0 ? (
                <div className="client-rest-day">
                  <span>Rest day</span>
                  <p>Recover. Recharge. Come back stronger.</p>
                </div>
              ) : (
                <div className="client-workout-list">
                  <div className="client-workout-labels">
                    <span>Workout</span>
                    <span>Sets</span>
                    <span>Reps</span>
                  </div>

                  {workouts.map((row, index) => (
                    <div
                      className="client-workout-item"
                      key={`${day}-${index}`}
                    >
                      <div className="client-workout-name">
                        {row.workout}
                      </div>

                      <div className="client-workout-value">
                        {row.sets || "—"}
                      </div>

                      <div className="client-workout-value">
                        {row.reps || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="client-workout-footer">
        fit&grit · built for showing up.
      </div>
    </main>
  );
}