"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

type MealRow = {
  meal: string;
  details: string;
};

type WeeklyDietPlan = {
  monday: MealRow[];
  tuesday: MealRow[];
  wednesday: MealRow[];
  thursday: MealRow[];
  friday: MealRow[];
  saturday: MealRow[];
  sunday: MealRow[];
};

const days: Array<keyof WeeklyDietPlan> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const emptyPlan: WeeklyDietPlan = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

export default function DietPage() {
  const router = useRouter();
  const supabase = createClient();

  const [plan, setPlan] = useState<WeeklyDietPlan>(emptyPlan);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDietPlan() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
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

      const { data: dietPlan, error: dietError } =
        await supabase
          .from("client_diet_plans")
          .select("plan_data")
          .eq("client_id", user.id)
          .maybeSingle();

      if (dietError) {
        console.error(
          "Could not load diet plan:",
          dietError
        );
      }

      if (dietPlan?.plan_data) {
        setPlan(
          dietPlan.plan_data as WeeklyDietPlan
        );
      }

      setLoading(false);
    }

    loadDietPlan();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="client-diet-loading">
        Loading your diet plan...
      </main>
    );
  }

  const rawFirstName =
    clientName.trim().split(/\s+/)[0] || "there";

  const firstName =
    rawFirstName.charAt(0).toUpperCase() +
    rawFirstName.slice(1).toLowerCase();

  return (
    <main className="client-diet-page">
      <header className="client-diet-header">
        <button
          type="button"
          className="client-workout-back"
          onClick={() => router.push("/home")}
        >
          ←
        </button>

        <div className="client-diet-eyebrow">
          YOUR NUTRITION
        </div>

        <h1>
          Weekly
          <br />
          <em>diet plan.</em>
        </h1>

        <p>
          Here&apos;s what&apos;s lined up for you,{" "}
          {firstName}.
        </p>
      </header>

      <section className="client-diet-plan">
        {days.map((day) => {
          const meals = plan[day] || [];

          return (
            <div
              className="client-diet-day"
              key={day}
            >
              <div className="client-diet-day-title">
                <span>{day.toUpperCase()}</span>

                <span className="client-diet-count">
                  {meals.length > 0
                    ? `${meals.length} ${
                        meals.length === 1
                          ? "MEAL"
                          : "MEALS"
                      }`
                    : "NO PLAN"}
                </span>
              </div>

              {meals.length === 0 ? (
                <div className="client-diet-empty">
                  <span>No meals added</span>
                  <p>
                    Your trainer hasn&apos;t added
                    anything for this day yet.
                  </p>
                </div>
              ) : (
                <div className="client-diet-list">
                  <div className="client-diet-labels">
                    <span>Meal</span>
                    <span>Food / Instructions</span>
                  </div>

                  {meals.map((row, index) => (
                    <div
                      className="client-diet-item"
                      key={`${day}-${index}`}
                    >
                      <div className="client-diet-meal">
                        {row.meal || "Meal"}
                      </div>

                      <div className="client-diet-details">
                        {row.details || "—"}
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