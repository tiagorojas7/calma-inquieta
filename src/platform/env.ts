import { z } from "zod";
import { err, ok, type Result } from "~/modules/_shared";

/**
 * The only place environment variables are declared (design D6). Every runtime
 * validates through `parseEnv`, and failures carry variable names only: a value
 * must never reach logs, error objects or response bodies.
 */

export type EnvIssueReason = "missing" | "invalid";

export interface EnvIssue {
  readonly name: string;
  readonly reason: EnvIssueReason;
}

export interface EnvError {
  readonly issues: readonly EnvIssue[];
}

const databaseUrl = z.url({ protocol: /^postgres(ql)?$/ });

/** Variables for `pnpm db:migrate` (a Node script reading `process.env`). */
export const migrationEnvSchema = z.object({
  MIGRATION_DATABASE_URL: databaseUrl,
});

/** Variables for the test harness; the override replaces the embedded server. */
export const testEnvSchema = z.object({
  TEST_DATABASE_URL: databaseUrl.optional(),
});

/**
 * Variables for the Worker: Cloudflare injects the Hyperdrive binding as an
 * object (extra properties such as host are stripped) next to plain vars.
 */
export const workerEnvSchema = z
  .object({
    HYPERDRIVE: z.object({ connectionString: databaseUrl }),
    BUILD_COMMIT: z.string().min(1),
    SITE_URL: z.url({ protocol: /^https?$/ }),
    // The indexing gate defaults to off; only the literal "on" opens it.
    SITE_INDEXING: z
      .enum(["on", "off"])
      .default("off")
      .transform((value) => value === "on"),
  })
  // The parsed protocol is lower-cased, matching what `z.url` accepted above.
  // Zod still runs this refine after a failed URL check, so an unparsable
  // SITE_URL passes here and is reported once, by its own field check.
  .refine(
    (env) => {
      const protocol = protocolOf(env.SITE_URL);
      return (
        !env.SITE_INDEXING || protocol === undefined || protocol === "https:"
      );
    },
    {
      // The path makes `parseEnv` report the issue as SITE_INDEXING, not (root).
      path: ["SITE_INDEXING"],
      message: "SITE_INDEXING=on requires an https SITE_URL",
    },
  );

function protocolOf(url: string): string | undefined {
  try {
    return new URL(url).protocol;
  } catch {
    return undefined;
  }
}

export type WorkerEnv = z.output<typeof workerEnvSchema>;

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Readonly<Record<string, unknown>>,
): Result<z.output<T>, EnvError> {
  const parsed = schema.safeParse(source);
  if (parsed.success) {
    return ok(parsed.data);
  }
  const seen = new Set<string>();
  const issues: EnvIssue[] = [];
  for (const issue of parsed.error.issues) {
    const name = String(issue.path[0] ?? "(root)");
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    issues.push({
      name,
      reason: source[name] === undefined ? "missing" : "invalid",
    });
  }
  return err({ issues });
}

export function formatEnvError(error: EnvError): string {
  const listed = error.issues
    .map((issue) => `${issue.name} (${issue.reason})`)
    .join(", ");
  return `Invalid environment: ${listed}`;
}

const workerEnvCache = new WeakMap<object, Result<WorkerEnv, EnvError>>();

/**
 * Validates the Worker bindings once per `env` object: the runtime hands the
 * same object to every request of an isolate, so later requests skip parsing.
 */
export function readWorkerEnv(env: object): Result<WorkerEnv, EnvError> {
  const cached = workerEnvCache.get(env);
  if (cached) {
    return cached;
  }
  const result = parseEnv(workerEnvSchema, env as Record<string, unknown>);
  workerEnvCache.set(env, result);
  return result;
}
