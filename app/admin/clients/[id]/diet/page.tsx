"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

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

const emptyRow = (): MealRow => ({
  meal: "",
  details: "",
});

const emptyPlan = (): WeeklyDietPlan => ({
  monday: [emptyRow()],
  tuesday: [emptyRow()],
  wednesday: [emptyRow()],
  thursday: [emptyRow()],
  friday: [emptyRow()],
  saturday: [emptyRow()],
  sunday: [emptyRow()],
});

const days: Array<keyof WeeklyDietPlan> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function ClientDietPage() {
  const params = useParams();
  const router = useRouter();

  const clientId = params.id as string;

  const supabase = createClient();

  const [clientName, setClientName] = useState("");
  const [plan, setPlan] = useState<WeeklyDietPlan>(emptyPlan());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

      if (profile.full_name) {
        setClientName(profile.full_name);
      }

      const {
        data: existingPlan,
        error: planError,
      } = await supabase
        .from("client_diet_plans")
        .select("plan_data")
        .eq("client_id", clientId)
        .maybeSingle();

      if (planError) {
        console.error("Could not load diet plan:", planError);
      }

      if (existingPlan?.plan_data) {
        const loadedPlan =
          existingPlan.plan_data as WeeklyDietPlan;

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
    day: keyof WeeklyDietPlan,
    index: number,
    field: keyof MealRow,
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

  function addRow(day: keyof WeeklyDietPlan) {
    setPlan((current) => ({
      ...current,
      [day]: [...current[day], emptyRow()],
    }));

    setMessage("");
  }

  function removeRow(
    day: keyof WeeklyDietPlan,
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

    const cleanedPlan = {} as WeeklyDietPlan;

    days.forEach((day) => {
      cleanedPlan[day] = plan[day]
        .map((row) => ({
          meal: row.meal.trim(),
          details: row.details.trim(),
        }))
        .filter(
          (row) =>
            row.meal !== "" ||
            row.details !== ""
        );
    });

    const { error } = await supabase
      .from("client_diet_plans")
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
      console.error("Diet save error:", error);

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
    setMessage("Diet plan saved.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="trainer-workout-loading">
        Loading diet plan...
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
            CLIENT DIET
          </div>

          <h1>
            {clientName || "Client"}&apos;s
            <br />
            diet plan
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

            <div className="trainer-diet-column-labels">
              <span>Meal</span>
              <span>Food / Instructions</span>
              <span />
            </div>

            <div className="trainer-day-rows">
              {plan[day].map(
                (row, index) => (
                  <div
                    className="trainer-diet-row"
                    key={index}
                  >
                    <input
                      type="text"
                      placeholder="Breakfast"
                      value={row.meal}
                      maxLength={40}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "meal",
                          event.target.value
                        )
                      }
                    />

                    <input
                      type="text"
                      placeholder="Oats + eggs + banana"
                      value={row.details}
                      maxLength={180}
                      onChange={(event) =>
                        updateRow(
                          day,
                          index,
                          "details",
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
            : "Save diet plan"}
        </button>
      </div>
    </main>
  );
}