import { isVisibleStatus } from "~/modules/workshops";
import type {
  PublicIntensivoRecord,
  PublicIntensivoRecords,
} from "~/modules/workshops";
import type { CatalogSeed, SeedIntensivo } from "./catalog-seed";

/**
 * Records over a seed that apply the same filters as the SQL adapter (status
 * in published/paused, `eventDate >= fromDate`) and select the same columns.
 */

function toRecord(row: SeedIntensivo): PublicIntensivoRecord {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    teacherId: row.teacherId,
    eventDate: row.eventDate,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    price: row.price,
    deposit: row.deposit,
    capacity: row.capacity,
    minSeats: row.minSeats,
    policyText: row.policyText,
    materialsIncluded: row.materialsIncluded,
    status: row.status,
    images: row.images.map((image) => ({
      assetId: image.assetId,
      alt: image.alt,
    })),
  };
}

export function createInMemoryPublicIntensivoRecords(
  seed: CatalogSeed,
): PublicIntensivoRecords {
  const visible = (fromDate: string) =>
    seed.intensivos.filter(
      (row) => isVisibleStatus(row.status) && row.eventDate >= fromDate,
    );
  return {
    listVisible: ({ fromDate }) =>
      Promise.resolve(visible(fromDate).map(toRecord)),
    findVisibleBySlug: (slug, { fromDate }) => {
      const row = visible(fromDate).find(
        (candidate) => candidate.slug === slug,
      );
      return Promise.resolve(row === undefined ? null : toRecord(row));
    },
    listVisibleSlugs: ({ fromDate }) =>
      Promise.resolve(visible(fromDate).map((row) => row.slug)),
  };
}
