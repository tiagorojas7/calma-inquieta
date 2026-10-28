import { describe, expect, it } from "vitest";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

const base = {
  databaseUrl: UNREACHABLE_URL,
  buildCommit: "abc",
  siteUrl: "https://calma.example.test",
  indexingEnabled: false,
  mediaBucket: null,
};

describe("createRequestServices notifications", () => {
  it("keeps email off without configuration and reads nothing", async () => {
    const services = createRequestServices(base, {}, createIsolateState());
    expect(services.emailEnabled).toBe(false);
    await expect(services.notifications.runDailyReminders()).resolves.toEqual({
      classes: 0,
      fees: 0,
      failed: 0,
    });
  });

  it("keeps email off when the configuration is null", () => {
    const services = createRequestServices(
      { ...base, email: null },
      {},
      createIsolateState(),
    );
    expect(services.emailEnabled).toBe(false);
  });

  it("turns email on when the key and the sender are configured", () => {
    const services = createRequestServices(
      {
        ...base,
        email: { apiKey: "re_key", from: "Calma <hola@calma.example.test>" },
      },
      {},
      createIsolateState(),
    );
    expect(services.emailEnabled).toBe(true);
  });
});
