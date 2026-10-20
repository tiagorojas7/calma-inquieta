import { isVisibleStatus } from "~/modules/workshops";
import type {
  PublicIntensivoRecord,
  PublicIntensivoRecords,
  PublicTallerRecord,
  PublicTallerRecords,
} from "~/modules/workshops";
import type { CatalogSeed, SeedIntensivo, SeedTaller } from "./catalog-seed";

/**
 * Records over a seed that apply the same filters as the SQL adapter (status
 * in published/paused, `eventDate >= fromDate`) and select the same columns.
 */

export function toPublicIntensivoRecord(
  row: SeedIntensivo,
): PublicIntensivoRecord {
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
      Promise.resolve(visible(fromDate).map(toPublicIntensivoRecord)),
    findVisibleBySlug: (slug, { fromDate }) => {
      const row = visible(fromDate).find(
        (candidate) => candidate.slug === slug,
      );
      return Promise.resolve(
        row === undefined ? null : toPublicIntensivoRecord(row),
      );
    },
    listVisibleSlugs: ({ fromDate }) =>
      Promise.resolve(visible(fromDate).map((row) => row.slug)),
  };
}

/**
 * The taller side: published or paused workshops, their active turnos, and
 * the open periods from the requested month, with capacities and project.
 * Nothing else (percentage, snapshot, audit, draft or closed periods) is copied.
 */
export function toPublicTallerRecord(
  row: SeedTaller,
  fromPeriod: string,
): PublicTallerRecord {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    technique: row.technique,
    teacherId: row.teacherId,
    status: row.status,
    images: row.images.map((image) => ({
      assetId: image.assetId,
      alt: image.alt,
    })),
    activeTurnos: row.turnos
      .filter((turno) => turno.active)
      .map((turno) => ({
        id: turno.id,
        label: turno.label,
        weekday: turno.weekday,
        startsAt: turno.startsAt,
        endsAt: turno.endsAt,
      })),
    openPeriods: row.periods
      .filter(
        (period) => period.status === "open" && period.period >= fromPeriod,
      )
      .map((period) => ({
        period: period.period,
        fee: period.fee,
        capacities: period.capacities.map((capacity) => ({
          turnoId: capacity.turnoId,
          capacity: capacity.capacity,
        })),
        project: {
          title: period.projectTitle,
          description: period.projectDescription,
          images: period.projectImages.map((image) => ({
            assetId: image.assetId,
            alt: image.alt,
          })),
        },
      })),
  };
}

export function createInMemoryPublicTallerRecords(
  seed: CatalogSeed,
): PublicTallerRecords {
  const visible = () =>
    seed.talleres.filter((row) => isVisibleStatus(row.status));
  return {
    listVisible: ({ fromPeriod }) =>
      Promise.resolve(
        visible().map((row) => toPublicTallerRecord(row, fromPeriod)),
      ),
    findVisibleBySlug: (slug, { fromPeriod }) => {
      const row = visible().find((candidate) => candidate.slug === slug);
      return Promise.resolve(
        row === undefined ? null : toPublicTallerRecord(row, fromPeriod),
      );
    },
    listVisibleSlugs: () => Promise.resolve(visible().map((row) => row.slug)),
  };
}
