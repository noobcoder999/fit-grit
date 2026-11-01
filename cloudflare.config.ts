import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "fit-and-grit",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-27",
    compatibilityFlags: ["nodejs_compat"],

    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },

    env: {
      ASSETS: bindings.assets(),

      NEXT_PUBLIC_SUPABASE_URL: bindings.text(
        "https://qixsblvurvgaxifknotb.supabase.co"
      ),

      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: bindings.text(
        "sb_publishable_THfInCYhfYs5xNeXqHzr7g_UCFlvI9V"
      ),
    },
  }),
});