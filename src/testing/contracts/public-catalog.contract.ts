import { describe, expect, it } from "vitest";
import type {
  PublicIntensivoRecords,
  PublicTallerRecords,
} from "~/modules/workshops";
import { createPublicIntensivosReader } from "~/modules/workshops/application/public-intensivos-reader";
import { createPublicTalleresReader } from "~/modules/workshops/application/public-talleres-reader";
import {
  buildSeed,
  fullyPopulatedSeed,
  seedIntensivo,
  seedMediaLookup,
  seedPeriod,
  seedTaller,
  seedTurno,
  seedTeacherLookup,
  type CatalogSeed,
} from "../fakes/catalog-seed";
import { fixedClock } from "../fakes/fixed-clock";

/** 12:00 on 2026-10-15 in Córdoba. */
const NOW = new Date("2026-10-15T15:00:00Z");

/** Builds the records adapter under test over exactly the given seed. */
export type IntensivoRecordsSetup = (
  seed: CatalogSeed,
) => Promise<PublicIntensivoRecords>;

/**
 * The reader suite runs at reader level (reader over records X, seed lookups,
 * fixed clock), so the fake and the Drizzle adapter must prove visibility,
 * expiry, ordering, slug lookup and enumeration identically (spec "Adapter parity").
 */
export function runPublicIntensivosContract(
  setup: IntensivoRecordsSetup,
): void {
  async function open(seed: CatalogSeed, now: Date = NOW) {
    const records = await setup(seed);
    let calls = 0;
    const counted: PublicIntensivoRecords = {
      listVisible: (query) => {
        calls += 1;
        return records.listVisible(query);
      },
      findVisibleBySlug: (slug, query) => {
        calls += 1;
        return records.findVisibleBySlug(slug, query);
      },
      listVisibleSlugs: (query) => {
        calls += 1;
        return records.listVisibleSlugs(query);
      },
    };
    const reader = createPublicIntensivosReader({
      records: counted,
      teachers: seedTeacherLookup(seed),
      media: seedMediaLookup(seed),
      clock: fixedClock(now),
    });
    return { reader, recordsCalls: () => calls };
  }

  const slugsOf = (items: readonly { readonly slug: string }[]) =>
    items.map((item) => item.slug);

  describe("public intensivos reader contract", () => {
    it("lists only the published and paused intensivos", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: [
            seedIntensivo({ slug: "publicado", status: "published" }),
            seedIntensivo({ slug: "pausado", status: "paused" }),
            seedIntensivo({ slug: "borrador", status: "draft" }),
            seedIntensivo({ slug: "archivado", status: "archived" }),
            seedIntensivo({ slug: "cancelado", status: "cancelled" }),
          ],
        }),
      );

      const listed = await reader.list();

      expect(listed.map((item) => [item.slug, item.status]).sort()).toEqual([
        ["pausado", "paused"],
        ["publicado", "open"],
      ]);
    });

    it("finds and enumerates no invisible intensivo", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: [
            seedIntensivo({ slug: "publicado" }),
            seedIntensivo({ slug: "borrador", status: "draft" }),
            seedIntensivo({ slug: "archivado", status: "archived" }),
            seedIntensivo({ slug: "cancelado", status: "cancelled" }),
          ],
        }),
      );

      expect(await reader.findBySlug("borrador")).toBeNull();
      expect(await reader.findBySlug("archivado")).toBeNull();
      expect(await reader.findBySlug("cancelado")).toBeNull();
      expect((await reader.findBySlug("publicado"))?.status).toBe("open");
      expect(await reader.listSlugs()).toEqual(["publicado"]);
    });

    it("keeps a paused intensivo in its date position, with the capacity and no availability", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: [
            seedIntensivo({ slug: "tercero", eventDate: "2026-11-30" }),
            seedIntensivo({
              slug: "pausado",
              status: "paused",
              eventDate: "2026-11-20",
              capacity: 9,
            }),
            seedIntensivo({ slug: "primero", eventDate: "2026-11-10" }),
          ],
        }),
      );

      const listed = await reader.list();

      expect(slugsOf(listed)).toEqual(["primero", "pausado", "tercero"]);
      expect(listed[1]?.seats).toEqual({ capacity: 9, available: null });
    });

    it("hides a past intensivo and keeps today's", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: [
            seedIntensivo({ slug: "ayer", eventDate: "2026-10-14" }),
            seedIntensivo({ slug: "hoy", eventDate: "2026-10-15" }),
          ],
        }),
      );

      expect(slugsOf(await reader.list())).toEqual(["hoy"]);
      expect(await reader.findBySlug("ayer")).toBeNull();
      expect((await reader.findBySlug("hoy"))?.slug).toBe("hoy");
      expect(await reader.listSlugs()).toEqual(["hoy"]);
    });

    it("decides the day in Córdoba, not UTC (01:00Z still D, 03:00Z is D+1)", async () => {
      const seed = buildSeed({
        intensivos: [
          seedIntensivo({ slug: "sabado", eventDate: "2026-10-31" }),
        ],
      });

      const lateEvening = await open(seed, new Date("2026-11-01T01:00:00Z"));
      const lastSecond = await open(seed, new Date("2026-11-01T02:59:59Z"));
      const nextDay = await open(seed, new Date("2026-11-01T03:00:00Z"));

      expect(slugsOf(await lateEvening.reader.list())).toEqual(["sabado"]);
      expect(slugsOf(await lastSecond.reader.list())).toEqual(["sabado"]);
      expect(await nextDay.reader.list()).toEqual([]);
    });

    it("orders by date, then start time, then name, then slug", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: [
            seedIntensivo({ slug: "e", eventDate: "2026-11-20" }),
            seedIntensivo({ slug: "d", eventDate: "2026-11-12" }),
            seedIntensivo({
              slug: "c",
              eventDate: "2026-11-05",
              startsAt: "15:00",
              endsAt: "18:00",
            }),
            seedIntensivo({ slug: "b", eventDate: "2026-11-05", name: "Zeta" }),
            seedIntensivo({
              slug: "a2",
              eventDate: "2026-11-05",
              name: "Alfa",
            }),
            seedIntensivo({
              slug: "a1",
              eventDate: "2026-11-05",
              name: "alfa",
            }),
          ],
        }),
      );

      expect(slugsOf(await reader.list())).toEqual([
        "a1",
        "a2",
        "b",
        "c",
        "d",
        "e",
      ]);
    });

    it("limits after sorting and rejects a limit that is not a positive integer", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: ["5", "1", "4", "2", "3"].map((day) =>
            seedIntensivo({ slug: `dia-${day}`, eventDate: `2026-11-0${day}` }),
          ),
        }),
      );

      expect(slugsOf(await reader.list({ limit: 3 }))).toEqual([
        "dia-1",
        "dia-2",
        "dia-3",
      ]);
      await expect(reader.list({ limit: 0 })).rejects.toThrow(RangeError);
      await expect(reader.list({ limit: -1 })).rejects.toThrow(RangeError);
      await expect(reader.list({ limit: 1.5 })).rejects.toThrow(RangeError);
    });

    it("finds by exact slug, and an unknown or foreign slug is null", async () => {
      const { reader } = await open(
        buildSeed({ intensivos: [seedIntensivo({ slug: "torno-intensivo" })] }),
      );

      expect((await reader.findBySlug("torno-intensivo"))?.slug).toBe(
        "torno-intensivo",
      );
      expect(await reader.findBySlug("torno")).toBeNull();
      expect(await reader.findBySlug("no-existe")).toBeNull();
      // A taller slug is not an intensivo slug: there is no cross-type lookup.
      expect(await reader.findBySlug("ceramica-inicial")).toBeNull();
    });

    it("answers an invalid slug with null before any records call", async () => {
      const { reader, recordsCalls } = await open(
        buildSeed({ intensivos: [seedIntensivo({ slug: "torno" })] }),
      );

      for (const slug of ["", "TORNO", "..", "a%2fb", "a b", "a".repeat(81)])
        expect(await reader.findBySlug(slug)).toBeNull();

      expect(recordsCalls()).toBe(0);
    });

    it("enumerates exactly the slugs that list returns", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: [
            seedIntensivo({ slug: "uno", eventDate: "2026-11-02" }),
            seedIntensivo({ slug: "dos", status: "paused" }),
            seedIntensivo({ slug: "tres", status: "draft" }),
            seedIntensivo({ slug: "cuatro", eventDate: "2026-10-01" }),
          ],
        }),
      );

      const listed = slugsOf(await reader.list());

      expect((await reader.listSlugs()).slice().sort()).toEqual(
        listed.slice().sort(),
      );
      expect(listed.slice().sort()).toEqual(["dos", "uno"]);
    });

    it("keeps the calendar date as stored, without a time-zone shift", async () => {
      const { reader } = await open(
        buildSeed({
          intensivos: [seedIntensivo({ slug: "uno", eventDate: "2026-11-14" })],
        }),
      );

      expect((await reader.findBySlug("uno"))?.date).toBe("2026-11-14");
    });

    it("projects the teacher and the images of a fully populated intensivo", async () => {
      const { reader } = await open(fullyPopulatedSeed());

      const found = await reader.findBySlug("intensivo-demo");

      expect(found?.teacher).toEqual({
        name: "Lucía Demo",
        bioLine: "Ceramista de demostración.",
      });
      expect(found?.images).toHaveLength(1);
      expect(found?.images[0]?.alt).toBe("Manos en el torno");
    });
  });
}

/** Builds the taller records adapter under test over exactly the given seed. */
export type TallerRecordsSetup = (
  seed: CatalogSeed,
) => Promise<PublicTallerRecords>;

export interface TalleresContractOptions {
  /**
   * Whether the adapter can store workshop and project images. The change-3
   * schema has no such tables yet (B5/B6b), so the Drizzle adapter returns
   * empty galleries and the image cases are skipped for it.
   */
  readonly storesImages: boolean;
}

/**
 * The taller reader suite: same cases for the in-memory and the Drizzle
 * records (spec "Adapter parity"), at reader level with seed lookups and a
 * fixed clock. NOW is 2026-10-15 in Córdoba, so the current month is 2026-10.
 */
export function runPublicTalleresContract(
  setup: TallerRecordsSetup,
  options: TalleresContractOptions = { storesImages: true },
): void {
  async function open(seed: CatalogSeed, now: Date = NOW) {
    const records = await setup(seed);
    let calls = 0;
    const counted: PublicTallerRecords = {
      listVisible: (query) => {
        calls += 1;
        return records.listVisible(query);
      },
      findVisibleBySlug: (slug, query) => {
        calls += 1;
        return records.findVisibleBySlug(slug, query);
      },
      listVisibleSlugs: () => {
        calls += 1;
        return records.listVisibleSlugs();
      },
    };
    const reader = createPublicTalleresReader({
      records: counted,
      teachers: seedTeacherLookup(seed),
      media: seedMediaLookup(seed),
      clock: fixedClock(now),
    });
    return { reader, recordsCalls: () => calls };
  }

  const slugsOf = (items: readonly { readonly slug: string }[]) =>
    items.map((item) => item.slug);

  // An open month is only offered while it holds an active turno (S3 of the
  // 2026-11-02 owner fixes), so the month fixtures carry one shared turno.
  const base = seedTurno({ label: "Turno base" });
  const monthOf = (
    overrides: Partial<ReturnType<typeof seedPeriod>> = {},
  ): ReturnType<typeof seedPeriod> =>
    seedPeriod({
      capacities: [{ turnoId: base.id, capacity: 10 }],
      ...overrides,
    });
  const periodsOf = (...months: string[]) =>
    months.map((period) => monthOf({ period }));

  async function offeringAt(
    periods: ReturnType<typeof seedPeriod>[],
    now: Date = NOW,
  ) {
    const { reader } = await open(
      buildSeed({
        talleres: [seedTaller({ slug: "t", turnos: [base], periods })],
      }),
      now,
    );
    return (await reader.findBySlug("t"))?.offering?.period ?? null;
  }

  describe("public talleres reader contract", () => {
    it("lists only the published and paused talleres", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({ slug: "publicado", status: "published" }),
            seedTaller({ slug: "pausado", status: "paused" }),
            seedTaller({ slug: "borrador", status: "draft" }),
            seedTaller({ slug: "archivado", status: "archived" }),
          ],
        }),
      );

      const listed = await reader.list();

      expect(listed.map((item) => [item.slug, item.status]).sort()).toEqual([
        ["pausado", "paused"],
        ["publicado", "open"],
      ]);
    });

    it("finds and enumerates no invisible taller", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({ slug: "publicado" }),
            seedTaller({ slug: "borrador", status: "draft" }),
            seedTaller({ slug: "archivado", status: "archived" }),
          ],
        }),
      );

      expect(await reader.findBySlug("borrador")).toBeNull();
      expect(await reader.findBySlug("archivado")).toBeNull();
      expect((await reader.findBySlug("publicado"))?.status).toBe("open");
      expect(await reader.listSlugs()).toEqual(["publicado"]);
    });

    it("keeps a paused taller listed, with no fee when it has no offering", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "pausado",
              status: "paused",
              turnos: [seedTurno()],
            }),
          ],
        }),
      );

      const [taller] = await reader.list();

      expect(taller?.status).toBe("paused");
      expect(taller?.offering).toBeNull();
      expect(taller?.project).toBeNull();
    });

    it("picks the current month when it is open", async () => {
      expect(await offeringAt(periodsOf("2026-11", "2026-10"))).toBe("2026-10");
    });

    it("picks the next open month when the current one is not open", async () => {
      expect(
        await offeringAt([
          monthOf({ period: "2026-10", status: "draft" }),
          monthOf({ period: "2026-11" }),
        ]),
      ).toBe("2026-11");
      expect(
        await offeringAt([
          monthOf({ period: "2026-10", status: "closed" }),
          monthOf({ period: "2026-11" }),
        ]),
      ).toBe("2026-11");
    });

    it("picks the earliest later open month", async () => {
      expect(
        await offeringAt([
          monthOf({ period: "2026-10", status: "draft" }),
          ...periodsOf("2026-12", "2026-11"),
        ]),
      ).toBe("2026-11");
    });

    it("gives no offering when no current or later month is open, and ignores a past month", async () => {
      expect(
        await offeringAt([
          monthOf({ period: "2026-10", status: "draft" }),
          seedPeriod({ period: "2026-11", status: "closed" }),
        ]),
      ).toBeNull();
      expect(await offeringAt(periodsOf("2026-09"))).toBeNull();
      expect(await offeringAt([])).toBeNull();
    });

    it("decides the month in Córdoba, not UTC (01:00Z still October, 03:00Z November)", async () => {
      const periods = periodsOf("2026-10", "2026-11");

      expect(await offeringAt(periods, new Date("2026-11-01T01:00:00Z"))).toBe(
        "2026-10",
      );
      expect(await offeringAt(periods, new Date("2026-11-01T02:59:59Z"))).toBe(
        "2026-10",
      );
      expect(await offeringAt(periods, new Date("2026-11-01T03:00:00Z"))).toBe(
        "2026-11",
      );
    });

    it("takes the fee from the selected period", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "t",
              turnos: [base],
              periods: [monthOf({ period: "2026-10" })],
            }),
          ],
        }),
      );

      const taller = await reader.findBySlug("t");

      expect(taller?.offering?.fee.toCentavos()).toBe(4_500_000);
      expect(taller?.offering?.period).toBe("2026-10");
    });

    it("orders the turnos by weekday, then start time, and never shows a retired one", async () => {
      const mie18 = seedTurno({
        label: "Mié 18",
        weekday: 3,
        startsAt: "18:00",
      });
      const lun18 = seedTurno({
        label: "Lun 18",
        weekday: 1,
        startsAt: "18:00",
      });
      const lun10 = seedTurno({
        label: "Lun 10",
        weekday: 1,
        startsAt: "10:00",
      });
      const dom = seedTurno({ label: "Dom", weekday: 7, startsAt: "09:00" });
      const retirado = seedTurno({ label: "Retirado", active: false });
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "t",
              turnos: [mie18, dom, retirado, lun18, lun10],
            }),
          ],
        }),
      );

      const taller = await reader.findBySlug("t");

      expect(taller?.turnos.map((turno) => turno.label)).toEqual([
        "Lun 10",
        "Lun 18",
        "Mié 18",
        "Dom",
      ]);
    });

    it("takes each turno capacity from the selected period only", async () => {
      const lunes = seedTurno({ label: "Lunes" });
      const martes = seedTurno({ label: "Martes", weekday: 2 });
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "t",
              turnos: [lunes, martes],
              periods: [
                seedPeriod({
                  period: "2026-10",
                  capacities: [
                    { turnoId: lunes.id, capacity: 8 },
                    { turnoId: martes.id, capacity: 6 },
                  ],
                }),
                seedPeriod({
                  period: "2026-11",
                  capacities: [{ turnoId: lunes.id, capacity: 3 }],
                }),
              ],
            }),
          ],
        }),
      );

      const taller = await reader.findBySlug("t");

      expect(
        taller?.turnos.map((turno) => [turno.label, turno.seats.capacity]),
      ).toEqual([
        ["Lunes", 8],
        ["Martes", 6],
      ]);
    });

    it("shows only the active turnos the selected period holds (DA1)", async () => {
      const lunes = seedTurno({ label: "Lunes" });
      const martes = seedTurno({ label: "Martes", weekday: 2 });
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "t",
              turnos: [lunes, martes],
              periods: [
                seedPeriod({
                  capacities: [{ turnoId: lunes.id, capacity: 8 }],
                }),
              ],
            }),
          ],
        }),
      );

      const taller = await reader.findBySlug("t");

      expect(taller?.turnos.map((turno) => turno.label)).toEqual(["Lunes"]);
    });

    it("gives every active turno a null capacity without an offering", async () => {
      const lunes = seedTurno({ label: "Lunes" });
      const martes = seedTurno({ label: "Martes", weekday: 2 });
      const { reader } = await open(
        buildSeed({
          talleres: [seedTaller({ slug: "t", turnos: [lunes, martes] })],
        }),
      );

      const taller = await reader.findBySlug("t");

      expect(taller?.turnos.map((turno) => turno.seats)).toEqual([
        { capacity: null, available: null },
        { capacity: null, available: null },
      ]);
    });

    it("never copies capacity into availability", async () => {
      const lunes = seedTurno();
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "t",
              turnos: [lunes],
              periods: [
                seedPeriod({
                  capacities: [{ turnoId: lunes.id, capacity: 8 }],
                }),
              ],
            }),
          ],
        }),
      );

      const [turno] = (await reader.findBySlug("t"))?.turnos ?? [];

      expect(turno?.seats.capacity).toBe(8);
      expect(turno?.seats.available).toBeNull();
    });

    it("exposes the project of the selected period only, and only when it has content (DA2)", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({
              slug: "con-proyecto",
              turnos: [base],
              periods: [
                monthOf({
                  period: "2026-10",
                  projectTitle: "Taza",
                  projectDescription: "Una taza con asa.",
                }),
                monthOf({ period: "2026-11", projectTitle: "Plato" }),
              ],
            }),
            seedTaller({
              slug: "solo-titulo",
              turnos: [base],
              periods: [monthOf({ projectTitle: "Solo título" })],
            }),
            seedTaller({
              slug: "sin-proyecto",
              turnos: [base],
              periods: [monthOf({ period: "2026-10" })],
            }),
          ],
        }),
      );

      expect((await reader.findBySlug("con-proyecto"))?.project).toEqual({
        title: "Taza",
        description: "Una taza con asa.",
        images: [],
      });
      expect((await reader.findBySlug("solo-titulo"))?.project?.title).toBe(
        "Solo título",
      );
      expect((await reader.findBySlug("sin-proyecto"))?.project).toBeNull();
    });

    it("orders the list by name, ignoring case and accents, then slug", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({ slug: "p", name: "Pintura" }),
            seedTaller({ slug: "c", name: "Cerámica" }),
            seedTaller({ slug: "a2", name: "acuarela" }),
            seedTaller({ slug: "a1", name: "Acuarela" }),
          ],
        }),
      );

      expect(slugsOf(await reader.list())).toEqual(["a1", "a2", "c", "p"]);
    });

    it("limits after sorting and rejects a limit that is not a positive integer", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: ["d", "b", "e", "a", "c"].map((name) =>
            seedTaller({ slug: `t-${name}`, name }),
          ),
        }),
      );

      expect(slugsOf(await reader.list({ limit: 3 }))).toEqual([
        "t-a",
        "t-b",
        "t-c",
      ]);
      await expect(reader.list({ limit: 0 })).rejects.toThrow(RangeError);
      await expect(reader.list({ limit: 1.5 })).rejects.toThrow(RangeError);
    });

    it("finds by exact slug, and an unknown or foreign slug is null", async () => {
      const { reader } = await open(
        buildSeed({ talleres: [seedTaller({ slug: "ceramica-inicial" })] }),
      );

      expect((await reader.findBySlug("ceramica-inicial"))?.slug).toBe(
        "ceramica-inicial",
      );
      expect(await reader.findBySlug("ceramica")).toBeNull();
      expect(await reader.findBySlug("no-existe")).toBeNull();
      // An intensivo slug is not a taller slug: there is no cross-type lookup.
      expect(await reader.findBySlug("intensivo-demo")).toBeNull();
    });

    it("answers an invalid slug with null before any records call", async () => {
      const { reader, recordsCalls } = await open(
        buildSeed({ talleres: [seedTaller({ slug: "torno" })] }),
      );

      for (const slug of ["", "TORNO", "..", "a%2fb", "a b", "a".repeat(81)])
        expect(await reader.findBySlug(slug)).toBeNull();

      expect(recordsCalls()).toBe(0);
    });

    it("enumerates exactly the slugs that list returns", async () => {
      const { reader } = await open(
        buildSeed({
          talleres: [
            seedTaller({ slug: "uno" }),
            seedTaller({ slug: "dos", status: "paused" }),
            seedTaller({ slug: "tres", status: "draft" }),
          ],
        }),
      );

      expect((await reader.listSlugs()).slice().sort()).toEqual(
        slugsOf(await reader.list())
          .slice()
          .sort(),
      );
      expect((await reader.listSlugs()).slice().sort()).toEqual(["dos", "uno"]);
    });

    it("projects the teacher, offering, capacity and project of a fully populated taller", async () => {
      const { reader } = await open(fullyPopulatedSeed());

      const found = await reader.findBySlug("taller-demo");

      expect(found?.teacher).toEqual({
        name: "Lucía Demo",
        bioLine: "Ceramista de demostración.",
      });
      expect(found?.offering?.period).toBe("2026-10");
      expect(found?.turnos[0]?.seats.capacity).toBe(8);
      expect(found?.project?.title).toBe("Taza con asa");
    });

    if (options.storesImages)
      it("projects the images of the taller and of its project", async () => {
        const { reader } = await open(fullyPopulatedSeed());

        const found = await reader.findBySlug("taller-demo");

        expect(found?.images.map((image) => image.alt)).toEqual([
          "Mesa de trabajo",
        ]);
        expect(found?.project?.images.map((image) => image.alt)).toEqual([
          "Taza terminada",
        ]);
      });
  });
}
