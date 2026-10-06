import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatEnvError,
  migrationEnvSchema,
  parseEnv,
  readWorkerEnv,
  testEnvSchema,
  workerEnvSchema,
} from "./env";

const URL_OK = "postgres://user:pw@localhost:5432/calma";

function failureOf(result: ReturnType<typeof parseEnv>) {
  if (result.ok) {
    return expect.unreachable("expected the environment to be rejected");
  }
  return result.error;
}

describe("parseEnv with the migration schema", () => {
  it("returns the typed configuration when every variable is valid", () => {
    const result = parseEnv(migrationEnvSchema, {
      MIGRATION_DATABASE_URL: URL_OK,
    });

    expect(result).toEqual({
      ok: true,
      value: { MIGRATION_DATABASE_URL: URL_OK },
    });
  });

  it("accepts the postgres and postgresql schemes", () => {
    const plain = parseEnv(migrationEnvSchema, {
      MIGRATION_DATABASE_URL: "postgres://localhost/db",
    });
    const long = parseEnv(migrationEnvSchema, {
      MIGRATION_DATABASE_URL: "postgresql://localhost/db",
    });

    expect(plain.ok).toBe(true);
    expect(long.ok).toBe(true);
  });

  it("names a missing variable as missing", () => {
    const error = failureOf(parseEnv(migrationEnvSchema, {}));

    expect(error.issues).toEqual([
      { name: "MIGRATION_DATABASE_URL", reason: "missing" },
    ]);
    expect(formatEnvError(error)).toBe(
      "Invalid environment: MIGRATION_DATABASE_URL (missing)",
    );
  });

  it("names an invalid variable without echoing its value", () => {
    const secret = "secret-token-123";
    const error = failureOf(
      parseEnv(migrationEnvSchema, { MIGRATION_DATABASE_URL: secret }),
    );

    expect(error.issues).toEqual([
      { name: "MIGRATION_DATABASE_URL", reason: "invalid" },
    ]);
    expect(formatEnvError(error)).toContain("MIGRATION_DATABASE_URL");
    expect(formatEnvError(error)).not.toContain(secret);
    expect(JSON.stringify(error)).not.toContain(secret);
  });

  it("rejects a well-formed url with a foreign scheme without echoing it", () => {
    const foreign = "http://secret-host.internal/db";
    const error = failureOf(
      parseEnv(migrationEnvSchema, { MIGRATION_DATABASE_URL: foreign }),
    );

    expect(error.issues).toEqual([
      { name: "MIGRATION_DATABASE_URL", reason: "invalid" },
    ]);
    expect(JSON.stringify(error)).not.toContain("secret-host");
  });

  it("lists every failing variable in one error", () => {
    const both = parseEnv(testEnvSchema.extend(migrationEnvSchema.shape), {
      TEST_DATABASE_URL: "not-a-url",
    });
    const error = failureOf(both);

    expect(error.issues.map((issue) => issue.name).sort()).toEqual([
      "MIGRATION_DATABASE_URL",
      "TEST_DATABASE_URL",
    ]);
    const message = formatEnvError(error);
    expect(message).toContain("MIGRATION_DATABASE_URL (missing)");
    expect(message).toContain("TEST_DATABASE_URL (invalid)");
  });
});

describe("parseEnv with the test schema", () => {
  it("treats TEST_DATABASE_URL as optional", () => {
    expect(parseEnv(testEnvSchema, {})).toEqual({ ok: true, value: {} });
  });

  it("returns TEST_DATABASE_URL when it is valid", () => {
    expect(parseEnv(testEnvSchema, { TEST_DATABASE_URL: URL_OK })).toEqual({
      ok: true,
      value: { TEST_DATABASE_URL: URL_OK },
    });
  });

  it("names an invalid TEST_DATABASE_URL", () => {
    const error = failureOf(
      parseEnv(testEnvSchema, { TEST_DATABASE_URL: "not-a-url" }),
    );

    expect(error.issues).toEqual([
      { name: "TEST_DATABASE_URL", reason: "invalid" },
    ]);
  });
});

const HYPERDRIVE_OK = { connectionString: URL_OK };

describe("parseEnv with the worker schema", () => {
  it("accepts the Hyperdrive binding and the build commit", () => {
    const result = parseEnv(workerEnvSchema, {
      HYPERDRIVE: HYPERDRIVE_OK,
      BUILD_COMMIT: "abc123",
    });

    expect(result).toEqual({
      ok: true,
      value: { HYPERDRIVE: HYPERDRIVE_OK, BUILD_COMMIT: "abc123" },
    });
  });

  it("ignores the extra properties the runtime adds to the binding", () => {
    const result = parseEnv(workerEnvSchema, {
      HYPERDRIVE: { ...HYPERDRIVE_OK, host: "db.internal", port: 5432 },
      BUILD_COMMIT: "abc123",
    });

    expect(result).toEqual({
      ok: true,
      value: { HYPERDRIVE: HYPERDRIVE_OK, BUILD_COMMIT: "abc123" },
    });
  });

  it("names a missing HYPERDRIVE binding", () => {
    const error = failureOf(
      parseEnv(workerEnvSchema, { BUILD_COMMIT: "abc123" }),
    );

    expect(error.issues).toEqual([{ name: "HYPERDRIVE", reason: "missing" }]);
  });

  it("names a binding of the wrong shape without echoing its value", () => {
    const secret = "postgres://user:secret-pw@secret-host.internal/db";
    const error = failureOf(
      parseEnv(workerEnvSchema, { HYPERDRIVE: secret, BUILD_COMMIT: "abc" }),
    );

    expect(error.issues).toEqual([{ name: "HYPERDRIVE", reason: "invalid" }]);
    expect(formatEnvError(error)).toBe(
      "Invalid environment: HYPERDRIVE (invalid)",
    );
    expect(JSON.stringify(error)).not.toContain("secret-pw");
  });

  it("names a binding whose connection string is malformed", () => {
    const error = failureOf(
      parseEnv(workerEnvSchema, {
        HYPERDRIVE: { connectionString: "secret-token-123" },
        BUILD_COMMIT: "abc",
      }),
    );

    expect(error.issues).toEqual([{ name: "HYPERDRIVE", reason: "invalid" }]);
    expect(JSON.stringify(error)).not.toContain("secret-token-123");
  });

  it("names an empty or missing BUILD_COMMIT", () => {
    const missing = failureOf(
      parseEnv(workerEnvSchema, { HYPERDRIVE: HYPERDRIVE_OK }),
    );
    const empty = failureOf(
      parseEnv(workerEnvSchema, {
        HYPERDRIVE: HYPERDRIVE_OK,
        BUILD_COMMIT: "",
      }),
    );

    expect(missing.issues).toEqual([
      { name: "BUILD_COMMIT", reason: "missing" },
    ]);
    expect(empty.issues).toEqual([{ name: "BUILD_COMMIT", reason: "invalid" }]);
  });
});

describe("readWorkerEnv", () => {
  const validEnv = () => ({
    HYPERDRIVE: { ...HYPERDRIVE_OK },
    BUILD_COMMIT: "abc123",
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed configuration", () => {
    expect(readWorkerEnv(validEnv())).toEqual({
      ok: true,
      value: { HYPERDRIVE: HYPERDRIVE_OK, BUILD_COMMIT: "abc123" },
    });
  });

  it("parses once per env object and returns the same result", () => {
    const spy = vi.spyOn(workerEnvSchema, "safeParse");
    const env = validEnv();

    const first = readWorkerEnv(env);
    const second = readWorkerEnv(env);

    expect(second).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("parses again for a new env object", () => {
    const spy = vi.spyOn(workerEnvSchema, "safeParse");

    const first = readWorkerEnv(validEnv());
    const second = readWorkerEnv(validEnv());

    expect(second).not.toBe(first);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("caches a failure too", () => {
    const env = { BUILD_COMMIT: "abc123" };

    const first = readWorkerEnv(env);

    expect(first.ok).toBe(false);
    expect(readWorkerEnv(env)).toBe(first);
  });
});
