import { describe, expect, it } from "vitest";
import {
  formatEnvError,
  migrationEnvSchema,
  parseEnv,
  testEnvSchema,
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
