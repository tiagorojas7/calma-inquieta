import { runMigrations } from "~/platform/db/migrate";
import { formatEnvError, migrationEnvSchema, parseEnv } from "~/platform/env";

// CI and local entry point (`pnpm db:migrate`). Configuration errors name the
// variable only; values never reach the output (design D6).
const env = parseEnv(migrationEnvSchema, process.env);
if (!env.ok) {
  console.error(formatEnvError(env.error));
  process.exitCode = 1;
} else {
  try {
    await runMigrations(env.value.MIGRATION_DATABASE_URL);
    console.log("Migrations applied.");
  } catch (error) {
    console.error(
      `Migration failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  }
}
