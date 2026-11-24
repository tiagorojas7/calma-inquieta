import { describe, expect, it } from "vitest";
import { err, ok } from "~/modules/_shared";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryPolicyRepository } from "~/testing/fakes/in-memory-policy-repository";
import type { PolicyVersion } from "../domain/policy-core";
import type { PolicyRepository } from "./policy-repository";
import { createPoliciesService } from "./policy-service";

const NOW = new Date("2026-11-17T15:00:00.000Z");
const actor = testAdminActor("owner@example.com");

const seeded = (
  kind: PolicyVersion["kind"],
  version: number,
  body: string,
): PolicyVersion => ({
  id: `id-${kind}-${String(version)}`,
  kind,
  version,
  body,
  publishedAt: new Date("2026-11-01T12:00:00Z"),
  publishedBy: "migration 0018",
});

/** The repository with some methods replaced (a class instance cannot be spread). */
const patched = (
  inner: PolicyRepository,
  patch: Partial<PolicyRepository>,
): PolicyRepository => ({
  latest: (kind) => inner.latest(kind),
  list: (kind) => inner.list(kind),
  exists: (kind, version) => inner.exists(kind, version),
  insert: (version) => inner.insert(version),
  ...patch,
});

function setup(
  options: {
    seed?: readonly PolicyVersion[];
    wrap?: (repository: PolicyRepository) => PolicyRepository;
  } = {},
) {
  const store = new InMemoryPolicyRepository();
  store.versions.push(
    ...(options.seed ?? [
      seeded("conditions", 1, "Condiciones base."),
      seeded("privacy", 1, "Privacidad base."),
    ]),
  );
  let counter = 0;
  const service = createPoliciesService({
    repository: options.wrap ? options.wrap(store) : store,
    clock: fixedClock(NOW),
    newId: () => {
      counter += 1;
      return `new-${String(counter)}`;
    },
  });
  return { store, service };
}

describe("current", () => {
  it("returns the latest version of each kind without an actor", async () => {
    const { store, service } = setup();
    store.versions.push(seeded("conditions", 2, "Condiciones nuevas."));

    const result = await service.current();

    expect(result).toEqual({
      ok: true,
      value: {
        conditions: seeded("conditions", 2, "Condiciones nuevas."),
        privacy: seeded("privacy", 1, "Privacidad base."),
      },
    });
  });

  it("is unavailable when a kind has no version", async () => {
    const { service } = setup({
      seed: [seeded("privacy", 1, "Solo privacidad.")],
    });
    expect(await service.current()).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  it("is unavailable when the store fails", async () => {
    const { service } = setup({
      wrap: (store) =>
        patched(store, { latest: () => Promise.reject(new Error("db down")) }),
    });
    expect(await service.current()).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("history", () => {
  it("lists the versions of one kind, newest first", async () => {
    const { store, service } = setup();
    store.versions.push(seeded("conditions", 2, "Condiciones nuevas."));

    const result = await service.history(actor, "conditions");

    expect(result.ok && result.value.map((item) => item.version)).toEqual([
      2, 1,
    ]);
    const privacy = await service.history(actor, "privacy");
    expect(privacy.ok && privacy.value.map((item) => item.body)).toEqual([
      "Privacidad base.",
    ]);
  });

  it("denies a missing actor", async () => {
    const { service } = setup();
    expect(await service.history(null, "conditions")).toEqual(
      err({ kind: "denied" }),
    );
  });
});

describe("publish", () => {
  it("stores the next number of that kind with the trimmed text, the actor and the clock", async () => {
    const { store, service } = setup();

    const result = await service.publish(
      actor,
      "conditions",
      "  Nuevo texto.\n",
    );

    const expected: PolicyVersion = {
      id: "new-1",
      kind: "conditions",
      version: 2,
      body: "Nuevo texto.",
      publishedAt: NOW,
      publishedBy: "owner@example.com",
    };
    expect(result).toEqual(ok(expected));
    expect(store.versions).toContainEqual(expected);
    // The other document and the first version stay as they were.
    expect(store.versions).toContainEqual(
      seeded("conditions", 1, "Condiciones base."),
    );
    expect(
      store.versions.filter((item) => item.kind === "privacy"),
    ).toHaveLength(1);
  });

  it("numbers each kind on its own, starting at 1 when it has none", async () => {
    const { service } = setup({ seed: [] });
    const first = await service.publish(actor, "privacy", "Primera.");
    expect(first.ok && first.value.version).toBe(1);
    const other = await service.publish(actor, "conditions", "Otra primera.");
    expect(other.ok && other.value.version).toBe(1);
    const second = await service.publish(actor, "privacy", "Segunda.");
    expect(second.ok && second.value.version).toBe(2);
  });

  it("refuses a blank text and stores nothing", async () => {
    const { store, service } = setup();
    expect(await service.publish(actor, "conditions", "  \n ")).toEqual(
      err({ kind: "invalid", issues: [{ field: "body", code: "required" }] }),
    );
    expect(store.versions).toHaveLength(2);
  });

  it("refuses a text identical to the current version and stores nothing", async () => {
    const { store, service } = setup();
    expect(
      await service.publish(actor, "conditions", " Condiciones base. "),
    ).toEqual(
      err({ kind: "invalid", issues: [{ field: "body", code: "duplicate" }] }),
    );
    expect(store.versions).toHaveLength(2);
  });

  it("allows the text of the other document", async () => {
    const { service } = setup();
    const result = await service.publish(
      actor,
      "conditions",
      "Privacidad base.",
    );
    expect(result.ok && result.value.version).toBe(2);
  });

  it("denies a missing actor and stores nothing", async () => {
    const { store, service } = setup();
    expect(await service.publish(null, "conditions", "Texto.")).toEqual(
      err({ kind: "denied" }),
    );
    expect(store.versions).toHaveLength(2);
  });

  it("retries once when another owner took the number first", async () => {
    let lost = false;
    const { store, service } = setup({
      wrap: (inner) =>
        patched(inner, {
          async insert(version) {
            if (!lost) {
              lost = true;
              // The other owner publishes version 2 between our read and write.
              await inner.insert(
                seeded("conditions", 2, "Texto de la otra dueña."),
              );
            }
            return inner.insert(version);
          },
        }),
    });

    const result = await service.publish(actor, "conditions", "Mi texto.");

    expect(result.ok && result.value.version).toBe(3);
    expect(store.versions.map((item) => item.body)).toContain("Mi texto.");
  });

  it("reports a conflict when the retry loses too", async () => {
    let taken = 1;
    const { store, service } = setup({
      wrap: (inner) =>
        patched(inner, {
          async insert(version) {
            taken += 1;
            await inner.insert(
              seeded("conditions", taken, `Ajena ${String(taken)}.`),
            );
            return inner.insert(version);
          },
        }),
    });

    const result = await service.publish(actor, "conditions", "Mi texto.");

    expect(result).toEqual(err({ kind: "conflict" }));
    expect(store.versions.map((item) => item.body)).not.toContain("Mi texto.");
  });
});

describe("isPublished", () => {
  it("is true only for a stored version of that kind", async () => {
    const { service } = setup();
    expect(await service.isPublished("conditions", 1)).toBe(true);
    expect(await service.isPublished("conditions", 2)).toBe(false);
    expect(await service.isPublished("privacy", 1)).toBe(true);
    expect(await service.isPublished("privacy", 0)).toBe(false);
  });
});
