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

export default function ClientsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Supabase RLS filters out other trainers' clients.
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, age, created_at"
        )
        .eq("role", "client")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("Client load error:", error);
        setLoading(false);
        return;
      }

      setClients(data || []);
      setLoading(false);
    }

    loadClients();
  }, [router, supabase]);

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
            router.push("/admin/dashboard")
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
          Everyone training with you, in one place.
        </p>
      </header>

      <section className="admin-client-list">
        {clients.length === 0 ? (
          <div className="admin-no-clients">
            <span>No clients yet.</span>

            <p>
              Once someone activates one of your invite
              codes, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          clients.map((client) => {
            const name =
              client.full_name?.trim() || "Client";

            const initial =
              name.charAt(0).toUpperCase();

            return (
              <article
                className="admin-client-card"
                key={client.id}
              >
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
    </main>
  );
}