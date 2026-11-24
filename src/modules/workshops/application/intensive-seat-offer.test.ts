import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import type { MediaAsset } from "~/modules/media";
import type {
  StoredIntensive,
  StoredIntensiveProject,
} from "./intensive-repository";
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

function project(
  overrides: Partial<StoredIntensiveProject> = {},
): StoredIntensiveProject {
  return {
    id: "project-1",
    intensiveId: "intensive-1",
    position: 0,
    name: "Taza de torno",
    description: null,
    image: null,
    price: money(40000),
    deposit: money(15000),
    audit: {
      updatedBy: "owner@example.com",
      updatedAt: new Date("2026-10-01"),
    },
    ...overrides,
  };
}

const ASSET: MediaAsset = {
  id: "asset-1",
  fileName: "taza.webp",
  src: "/media/taza.webp",
  contentType: "image/webp",
  byteSize: 1000,
  width: 800,
  height: 600,
  createdBy: "owner@example.com",
  createdAt: new Date("2026-10-01"),
};

function lookup(
  item: StoredIntensive | null,
  now = "2026-10-28T15:00:00.000Z",
  projects: readonly StoredIntensiveProject[] = [project()],
) {
  return createIntensiveSeatOfferLookup({
    repository: {
      findBySlug: (slug) => Promise.resolve(item?.slug === slug ? item : null),
      findById: (id) => Promise.resolve(item?.id === id ? item : null),
      listProjects: (id) => Promise.resolve(item?.id === id ? projects : []),
    },
    media: {
      findAssets: (ids) =>
        Promise.resolve(
          new Map(ids.includes(ASSET.id) ? [[ASSET.id, ASSET]] : []),
        ),
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
      projects: [
        {
          id: "project-1",
          name: "Taza de torno",
          description: null,
          image: null,
          price: money(40000),
          deposit: money(15000),
        },
      ],
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

  it("lists the projects in their admin order with the cover resolved to its public image", async () => {
    const offer = await lookup(stored(), undefined, [
      project({
        id: "project-1",
        position: 0,
        name: "Taza",
        description: "Una taza al torno.",
        image: { assetId: ASSET.id, alt: "Una taza" },
      }),
      project({
        id: "project-2",
        position: 1,
        name: "Plato",
        price: money(30000),
        deposit: money(10000),
      }),
    ]).findBySlug("intensivo-de-ceramica");

    expect(offer?.projects).toEqual([
      {
        id: "project-1",
        name: "Taza",
        description: "Una taza al torno.",
        image: {
          src: "/media/taza.webp",
          alt: "Una taza",
          width: 800,
          height: 600,
        },
        price: money(40000),
        deposit: money(15000),
      },
      {
        id: "project-2",
        name: "Plato",
        description: null,
        image: null,
        price: money(30000),
        deposit: money(10000),
      },
    ]);
  });

  it("drops the image of a project whose asset the media lookup does not know", async () => {
    const offer = await lookup(stored(), undefined, [
      project({ image: { assetId: "missing", alt: "Perdida" } }),
    ]).findById("intensive-1");

    expect(offer?.projects[0]?.image).toBeNull();
  });
});
