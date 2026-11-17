import { describe, expect, it } from "vitest";
import { InMemoryPrivateEventRepository } from "~/testing/fakes/in-memory-private-event-repository";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { createPrivateEventService } from "./private-event-service";
import type { PrivateEventDraft } from "../domain/private-event-core";

const NOW = new Date("2026-10-28T15:00:00.000Z");
const ID = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";

function setup() {
  const repository = new InMemoryPrivateEventRepository();
  const service = createPrivateEventService({
    repository,
    clock: fixedClock(NOW),
    newId: () => ID,
  });
  return { repository, service };
}

const draft: PrivateEventDraft = {
  fullName: "Ana Pérez",
  phone: "351 555 0101",
  email: "ana@example.com",
  desiredDate: "2026-12-05",
  place: "Casa en Nueva Córdoba",
  participants: "12",
  notes: "",
  honeypot: "",
};

describe("requestEvent", () => {
  it("stores a normalized new request and answers received", async () => {
    const { repository, service } = setup();

    expect(await service.requestEvent(draft)).toEqual({
      ok: true,
      value: { received: true },
    });
    expect(repository.requests.get(ID)).toEqual({
      id: ID,
      fullName: "Ana Pérez",
      phoneDigits: "5493515550101",
      email: "ana@example.com",
      desiredDate: "2026-12-05",
      place: "Casa en Nueva Córdoba",
      participants: 12,
      notes: null,
      status: "nueva",
      createdAt: NOW,
      statusChangedBy: null,
      statusChangedAt: null,
    });
  });

  it("returns the field issues and stores nothing when invalid", async () => {
    const { repository, service } = setup();

    const result = await service.requestEvent({
      ...draft,
      desiredDate: "2026-10-27",
      participants: "0",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "desiredDate", code: "in-past" },
          { field: "participants", code: "out-of-range" },
        ],
      },
    });
    expect(repository.requests.size).toBe(0);
  });

  it("answers a honeypot like success without storing", async () => {
    const { repository, service } = setup();

    expect(await service.requestEvent({ ...draft, honeypot: "x" })).toEqual({
      ok: true,
      value: { received: true },
    });
    expect(repository.requests.size).toBe(0);
  });
});

describe("admin use cases", () => {
  const admin = testAdminActor("owner@example.com");

  it("denies every admin use case without an actor", async () => {
    const { service } = setup();
    const denied = { ok: false, error: { kind: "denied" } };

    expect(await service.list(null)).toEqual(denied);
    expect(await service.get(undefined, ID)).toEqual(denied);
    expect(await service.setStatus(null, ID, "cerrada")).toEqual(denied);
  });

  it("lists by status and gets one request", async () => {
    const { service } = setup();
    await service.requestEvent(draft);

    const all = await service.list(admin);
    expect(all.ok && all.value.map((r) => r.id)).toEqual([ID]);
    const none = await service.list(admin, "cerrada");
    expect(none.ok && none.value).toEqual([]);
    const one = await service.get(admin, ID);
    expect(one.ok && one.value.fullName).toBe("Ana Pérez");
  });

  it("reports not-found for unknown ids", async () => {
    const { service } = setup();
    const missing = { ok: false, error: { kind: "not-found" } };

    expect(await service.get(admin, ID)).toEqual(missing);
    expect(await service.setStatus(admin, ID, "cerrada")).toEqual(missing);
  });

  it("records who changed the status and when", async () => {
    const { service } = setup();
    await service.requestEvent(draft);

    const result = await service.setStatus(admin, ID, "contactada");

    expect(result.ok && result.value).toMatchObject({
      status: "contactada",
      statusChangedBy: "owner@example.com",
      statusChangedAt: NOW,
    });
  });
});

describe("shared read state", () => {
  const admin = testAdminActor("owner@example.com");

  it("leaves a new public request unread", async () => {
    const { repository, service } = setup();
    await service.requestEvent(draft);

    expect((await repository.unseen()).map((request) => request.id)).toEqual([
      ID,
    ]);
  });

  it("marks a request read for both owners, once", async () => {
    const { repository, service } = setup();
    await service.requestEvent(draft);

    expect(await service.markSeen(admin, ID)).toEqual({
      ok: true,
      value: { kind: "seen" },
    });
    expect(
      await service.markSeen(testAdminActor("second@example.com"), ID),
    ).toEqual({ ok: true, value: { kind: "already-seen" } });
    expect(await repository.unseen()).toEqual([]);
    expect(repository.seenMarks.get(ID)).toEqual({
      by: "owner@example.com",
      at: NOW,
    });
  });

  it("denies without an actor and reports not-found for an unknown id", async () => {
    const { service } = setup();

    expect(await service.markSeen(null, ID)).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
    expect(await service.markSeen(admin, ID)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("keeps the inbox list and the status of the request exactly as they were", async () => {
    const { service } = setup();
    await service.requestEvent(draft);
    const before = await service.list(admin, "nueva");

    await service.markSeen(admin, ID);

    expect(await service.list(admin, "nueva")).toEqual(before);
  });
});
