import { afterEach, describe, expect, it, vi } from "vitest";
import { createIsolateState } from "~/composition/request-services";
import { handleScheduled } from "./app";

const env = {
  HYPERDRIVE: { connectionString: "postgres://postgres@127.0.0.1:1/none" },
  BUILD_COMMIT: "test",
  SITE_URL: "http://localhost:5173",
  SITE_INDEXING: "off",
};

const withEmail = {
  ...env,
  RESEND_API_KEY: "re_secret_key",
  EMAIL_FROM: "Calma <hola@calma.example.test>",
};

const runtime = { waitUntil: () => undefined };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleScheduled", () => {
  it("does nothing, and opens no connection, while email is not configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(
      handleScheduled(env, runtime, createIsolateState(), "production"),
    ).resolves.toBeNull();
    await expect(
      handleScheduled(
        { ...env, RESEND_API_KEY: "re_secret_key" },
        runtime,
        createIsolateState(),
        "production",
      ),
    ).resolves.toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it("runs the daily reminders through composition when email is configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    // The audience read fails against the unreachable database; the job
    // swallows it, reports it by name and still finishes.
    await expect(
      handleScheduled(withEmail, runtime, createIsolateState(), "production"),
    ).resolves.toEqual({ classes: 0, fees: 0, failed: 0 });

    expect(warn).toHaveBeenCalledWith(
      "Email notification failed: audience-failed",
    );
    expect(log).toHaveBeenCalledWith(
      "Daily email reminders: classes=0 fees=0 failed=0",
    );
    expect(JSON.stringify([warn.mock.calls, log.mock.calls])).not.toContain(
      "re_secret_key",
    );
  });

  it("reports an invalid environment by variable name and does not throw", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      handleScheduled({}, runtime, createIsolateState(), "production"),
    ).resolves.toBeNull();
    expect(error).toHaveBeenCalledOnce();
  });
});
