import { describe, expect, it } from "vitest";
import type { PublicIntensivoRecords } from "~/modules/workshops";
import { createPublicIntensivosReader } from "~/modules/workshops/application/public-intensivos-reader";
import {
  buildSeed,
  fullyPopulatedSeed,
  seedIntensivo,
  seedMediaLookup,
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
