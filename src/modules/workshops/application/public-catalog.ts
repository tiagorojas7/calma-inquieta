import type { Clock, Money } from "~/modules/_shared";
import type { MediaLookup } from "~/modules/media";
import type { TeacherLookup } from "~/modules/teachers";
import type {
  IntensiveStatus,
  LocalTime,
  PeriodKey,
  Weekday,
  WorkshopStatus,
} from "./contracts";

/**
 * The public catalog: an actorless read path over the visible talleres and
 * intensivos. Every read model below is an allowlist; nothing private (ids,
 * audit fields, storage metadata, contact data) has a field to travel in.
 */

export type PublicStatus = "open" | "paused";

export interface PublicImage {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface PublicTeacher {
  readonly name: string;
  readonly bioLine: string | null;
}

/** `available` stays the literal null until change 5 adds confirmed seats. */
export interface PublicSeats {
  readonly capacity: number | null;
  readonly available: null;
}

export interface PublicTurno {
  readonly label: string;
  readonly weekday: Weekday;
  readonly startsAt: LocalTime;
  readonly endsAt: LocalTime;
  readonly seats: PublicSeats;
}

export interface PublicOffering {
  readonly period: PeriodKey;
  readonly fee: Money;
}

export interface PublicProject {
  readonly title: string;
  readonly description: string;
  readonly images: readonly PublicImage[];
}

export interface PublicTaller {
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly technique: string;
  readonly teacher: PublicTeacher | null;
  readonly images: readonly PublicImage[];
  readonly status: PublicStatus;
  /** Ordered by weekday, then start time. */
  readonly turnos: readonly PublicTurno[];
  readonly offering: PublicOffering | null;
  readonly project: PublicProject | null;
}

export interface PublicIntensivo {
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly teacher: PublicTeacher | null;
  /** `YYYY-MM-DD`, a Córdoba calendar date. */
  readonly date: string;
  readonly startsAt: LocalTime;
  readonly endsAt: LocalTime;
  readonly price: Money;
  readonly deposit: Money;
  readonly minSeats: number;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly images: readonly PublicImage[];
  readonly status: PublicStatus;
  readonly seats: PublicSeats;
}

export interface ListOptions {
  readonly limit?: number;
}

export interface PublicTalleresReader {
  list(options?: ListOptions): Promise<readonly PublicTaller[]>;
  findBySlug(slug: string): Promise<PublicTaller | null>;
  listSlugs(): Promise<readonly string[]>;
}

export interface PublicIntensivosReader {
  list(options?: ListOptions): Promise<readonly PublicIntensivo[]>;
  findBySlug(slug: string): Promise<PublicIntensivo | null>;
  listSlugs(): Promise<readonly string[]>;
}

export interface PublicCatalogService {
  readonly talleres: PublicTalleresReader;
  readonly intensivos: PublicIntensivosReader;
}

// Records ports: implemented in infrastructure, which never selects private columns.

/** A reference to a stored image, in position order. */
export interface CatalogImageRef {
  readonly assetId: string;
  readonly alt: string;
}

export interface PublicTallerRecord {
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly technique: string;
  readonly teacherId: string | null;
  readonly status: WorkshopStatus;
  readonly images: readonly CatalogImageRef[];
  readonly activeTurnos: readonly {
    readonly id: string;
    readonly label: string;
    readonly weekday: Weekday;
    readonly startsAt: LocalTime;
    readonly endsAt: LocalTime;
  }[];
  /** Stored as open, with a period at or after the requested month. */
  readonly openPeriods: readonly {
    readonly period: PeriodKey;
    readonly fee: Money;
    readonly capacities: readonly {
      readonly turnoId: string;
      readonly capacity: number;
    }[];
    readonly project: {
      readonly title: string | null;
      readonly description: string | null;
      readonly images: readonly CatalogImageRef[];
    };
  }[];
}

export interface PublicTallerRecords {
  listVisible(query: {
    readonly fromPeriod: PeriodKey;
  }): Promise<readonly PublicTallerRecord[]>;
  findVisibleBySlug(
    slug: string,
    query: { readonly fromPeriod: PeriodKey },
  ): Promise<PublicTallerRecord | null>;
  listVisibleSlugs(): Promise<readonly string[]>;
}

export interface PublicIntensivoRecord {
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly teacherId: string | null;
  readonly eventDate: string;
  readonly startsAt: LocalTime;
  readonly endsAt: LocalTime;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly status: IntensiveStatus;
  readonly images: readonly CatalogImageRef[];
}

export interface PublicIntensivoRecords {
  listVisible(query: {
    readonly fromDate: string;
  }): Promise<readonly PublicIntensivoRecord[]>;
  findVisibleBySlug(
    slug: string,
    query: { readonly fromDate: string },
  ): Promise<PublicIntensivoRecord | null>;
  listVisibleSlugs(query: {
    readonly fromDate: string;
  }): Promise<readonly string[]>;
}

export interface PublicReaderDeps<R> {
  readonly records: R;
  readonly teachers: TeacherLookup;
  readonly media: MediaLookup;
  readonly clock: Clock;
}

/** Factory signatures only; the implementations arrive in C4-B3 and C4-B2. */
export type CreatePublicTalleresReader = (
  deps: PublicReaderDeps<PublicTallerRecords>,
) => PublicTalleresReader;
export type CreatePublicIntensivosReader = (
  deps: PublicReaderDeps<PublicIntensivoRecords>,
) => PublicIntensivosReader;
