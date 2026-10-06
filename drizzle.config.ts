import { defineConfig } from "drizzle-kit";

// Generate-only: migrations are applied by `pnpm db:migrate`
// (src/platform/db/migrate.ts), so no credentials are needed here (design D9).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/platform/db/schema.ts",
  out: "./drizzle",
});
