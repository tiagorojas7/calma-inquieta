import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import type { StoredIntensive } from "./intensive-repository";
import { createIntensiveSeatOfferLookup } from "./intensive-seat-offer";

const money = (pesos: number): Money => {
  const value = Money.fromCentavos(pesos * 100);
  if (!value.ok) throw new Error("fixture money");
  return value.value;
};

function stored(overrides: Partial<StoredIntensive> = {}): StoredIntensive {
  return {
    id: "intensive-1",
    slug: "intensivo-de-ceramica",
    name: "Intensivo de cerámica",
    summary: "Resumen",
    description: "Descripción",
    teacherId: "teacher-1",
    percentage: null,
    eventDate: "2026-11-14",
    startsAt: "10:00",
    endsAt: "14:00",
    price: money(40000),
    deposit: money(15000),
    capacity: 8,
    minSeats: 4,
    policyText: "Devolvemos la seña si no hay cupo mínimo.",
    materialsIncluded: false,
    images: [],
    status: "published",
    audit: {
      updatedBy: "owner@example.com",
      updatedAt: new Date("2026-10-01"),
    },
    ...overrides,
  };
}

function lookup(
  item: StoredIntensive | null,
  now = "2026-10-28T15:00:00.000Z",
) {
  return createIntensiveSeatOfferLookup({
    repository: {
      findBySlug: (slug) => Promise.resolve(item?.slug === slug ? item : null),
      findById: (id) => Promise.resolve(item?.id === id ? item : null),
    },
    clock: fixedClock(new Date(now)),
  });
}

describe("createIntensiveSeatOfferLookup", () => {
  it("projects only the terms the seat flow needs, found by slug or by id", async () => {
    const expected = {
      id: "intensive-1",
      slug: "intensivo-de-ceramica",
      name: "Intensivo de cerámica",
      status: "published",
      upcoming: true,
      eventDate: "2026-11-14",
      startsAt: "10:00",
      endsAt: "14:00",
      price: money(40000),
      deposit: money(15000),
      capacity: 8,
      minSeats: 4,
      policyText: "Devolvemos la seña si no hay cupo mínimo.",
    };

    expect(await lookup(stored()).findBySlug("intensivo-de-ceramica")).toEqual(
      expected,
    );
    expect(await lookup(stored()).findById("intensive-1")).toEqual(expected);
  });

  it("answers null for an unknown slug or id", async () => {
    expect(await lookup(null).findBySlug("nada")).toBeNull();
    expect(await lookup(null).findById("nada")).toBeNull();
  });

  it("keeps the stored status, drafts and paused ones included", async () => {
    const draft = await lookup(stored({ status: "draft" })).findById(
      "intensive-1",
    );
    expect(draft?.status).toBe("draft");
  });

  it("is upcoming only while the start is after the current Córdoba minute", async () => {
    const started = lookup(stored(), "2026-11-14T13:00:00.000Z");
    const notYet = lookup(stored(), "2026-11-14T12:59:00.000Z");

    expect((await started.findById("intensive-1"))?.upcoming).toBe(false);
    expect((await notYet.findById("intensive-1"))?.upcoming).toBe(true);
  });
});
