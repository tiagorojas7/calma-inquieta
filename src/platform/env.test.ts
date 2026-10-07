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
const SITE_OK = "https://calma.example.workers.dev";

const workerSource = (extra: Record<string, unknown> = {}) => ({
  HYPERDRIVE: HYPERDRIVE_OK,
  BUILD_COMMIT: "abc123",
  SITE_URL: SITE_OK,
  ...extra,
});

describe("parseEnv with the worker schema", () => {
  it("accepts the Hyperdrive binding, the build commit and the site url", () => {
    const result = parseEnv(workerEnvSchema, workerSource());

    expect(result).toEqual({
      ok: true,
      value: {
        HYPERDRIVE: HYPERDRIVE_OK,
        BUILD_COMMIT: "abc123",
        SITE_URL: SITE_OK,
        SITE_INDEXING: false,
      },
    });
  });

  it("ignores the extra properties the runtime adds to the binding", () => {
    const result = parseEnv(
      workerEnvSchema,
      workerSource({
        HYPERDRIVE: { ...HYPERDRIVE_OK, host: "db.internal", port: 5432 },
      }),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        HYPERDRIVE: HYPERDRIVE_OK,
        BUILD_COMMIT: "abc123",
        SITE_URL: SITE_OK,
        SITE_INDEXING: false,
      },
    });
  });

  it("names a missing HYPERDRIVE binding", () => {
    const error = failureOf(
      parseEnv(workerEnvSchema, {
        BUILD_COMMIT: "abc123",
        SITE_URL: SITE_OK,
      }),
    );

    expect(error.issues).toEqual([{ name: "HYPERDRIVE", reason: "missing" }]);
  });

  it("names a binding of the wrong shape without echoing its value", () => {
    const secret = "postgres://user:secret-pw@secret-host.internal/db";
    const error = failureOf(
      parseEnv(workerEnvSchema, workerSource({ HYPERDRIVE: secret })),
    );

    expect(error.issues).toEqual([{ name: "HYPERDRIVE", reason: "invalid" }]);
    expect(formatEnvError(error)).toBe(
      "Invalid environment: HYPERDRIVE (invalid)",
    );
    expect(JSON.stringify(error)).not.toContain("secret-pw");
  });

  it("names a binding whose connection string is malformed", () => {
    const error = failureOf(
      parseEnv(
        workerEnvSchema,
        workerSource({ HYPERDRIVE: { connectionString: "secret-token-123" } }),
      ),
    );

    expect(error.issues).toEqual([{ name: "HYPERDRIVE", reason: "invalid" }]);
    expect(JSON.stringify(error)).not.toContain("secret-token-123");
  });

  it("names an empty or missing BUILD_COMMIT", () => {
    const missing = failureOf(
      parseEnv(workerEnvSchema, {
        HYPERDRIVE: HYPERDRIVE_OK,
        SITE_URL: SITE_OK,
      }),
    );
    const empty = failureOf(
      parseEnv(workerEnvSchema, workerSource({ BUILD_COMMIT: "" })),
    );

    expect(missing.issues).toEqual([
      { name: "BUILD_COMMIT", reason: "missing" },
    ]);
    expect(empty.issues).toEqual([{ name: "BUILD_COMMIT", reason: "invalid" }]);
  });

  it("keeps the schema shape readable for the hygiene test", () => {
    expect(Object.keys(workerEnvSchema.shape).sort()).toEqual([
      "BUILD_COMMIT",
      "HYPERDRIVE",
      "SITE_INDEXING",
      "SITE_URL",
    ]);
  });
});

describe("parseEnv with the site configuration", () => {
  it("names a missing SITE_URL", () => {
    const error = failureOf(
      parseEnv(workerEnvSchema, {
        HYPERDRIVE: HYPERDRIVE_OK,
        BUILD_COMMIT: "abc123",
      }),
    );

    expect(error.issues).toEqual([{ name: "SITE_URL", reason: "missing" }]);
    expect(formatEnvError(error)).toBe(
      "Invalid environment: SITE_URL (missing)",
    );
  });

  it.each(["not a url", "ftp://x.example.com"])(
    "rejects the invalid SITE_URL %j without echoing it",
    (value) => {
      const error = failureOf(
        parseEnv(workerEnvSchema, workerSource({ SITE_URL: value })),
      );

      expect(error.issues).toEqual([{ name: "SITE_URL", reason: "invalid" }]);
      expect(JSON.stringify(error)).not.toContain(value);
    },
  );

  it("accepts an http SITE_URL while indexing is off", () => {
    const result = parseEnv(
      workerEnvSchema,
      workerSource({ SITE_URL: "http://localhost:5173" }),
    );

    expect(result.ok && result.value.SITE_URL).toBe("http://localhost:5173");
  });

  it("resolves SITE_INDEXING to false when absent or off", () => {
    const absent = parseEnv(workerEnvSchema, workerSource());
    const off = parseEnv(
      workerEnvSchema,
      workerSource({ SITE_INDEXING: "off" }),
    );

    expect(absent.ok && absent.value.SITE_INDEXING).toBe(false);
    expect(off.ok && off.value.SITE_INDEXING).toBe(false);
  });

  it("resolves SITE_INDEXING on to true with an https SITE_URL", () => {
    const result = parseEnv(
      workerEnvSchema,
      workerSource({ SITE_INDEXING: "on" }),
    );

    expect(result.ok && result.value.SITE_INDEXING).toBe(true);
  });

  it("accepts an upper-case HTTPS scheme with SITE_INDEXING on, like z.url does", () => {
    const result = parseEnv(
      workerEnvSchema,
      workerSource({
        SITE_INDEXING: "on",
        SITE_URL: "HTTPS://calma.example.workers.dev",
      }),
    );

    expect(result.ok && result.value.SITE_INDEXING).toBe(true);
  });

  it("rejects SITE_INDEXING on with an http SITE_URL, naming SITE_INDEXING", () => {
    const error = failureOf(
      parseEnv(
        workerEnvSchema,
        workerSource({
          SITE_INDEXING: "on",
          SITE_URL: "http://secret-host.example.com",
        }),
      ),
    );

    expect(error.issues).toEqual([
      { name: "SITE_INDEXING", reason: "invalid" },
    ]);
    expect(formatEnvError(error)).toBe(
      "Invalid environment: SITE_INDEXING (invalid)",
    );
    expect(JSON.stringify(error)).not.toContain("secret-host");
  });

  it("rejects a SITE_INDEXING value other than on or off", () => {
    const error = failureOf(
      parseEnv(workerEnvSchema, workerSource({ SITE_INDEXING: "yes" })),
    );

    expect(error.issues).toEqual([
      { name: "SITE_INDEXING", reason: "invalid" },
    ]);
    expect(JSON.stringify(error)).not.toContain("yes");
  });
});

describe("readWorkerEnv", () => {
  const validEnv = () => workerSource({ HYPERDRIVE: { ...HYPERDRIVE_OK } });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed configuration", () => {
    expect(readWorkerEnv(validEnv())).toEqual({
      ok: true,
      value: {
        HYPERDRIVE: HYPERDRIVE_OK,
        BUILD_COMMIT: "abc123",
        SITE_URL: SITE_OK,
        SITE_INDEXING: false,
      },
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
