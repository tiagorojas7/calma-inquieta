import { Money } from "~/modules/_shared";
import type { MediaAsset, MediaLookup } from "~/modules/media";
import type { Teacher, TeacherLookup } from "~/modules/teachers";
import type { CatalogImageRef, IntensiveStatus } from "~/modules/workshops";
import { buildMediaAsset, buildTeacher } from "./admin-builders";

/**
 * What the change-3 tables hold, in the shape the catalog tests share: the
 * in-memory records read it directly and `db/seed-catalog.ts` inserts it, so
 * both adapters run the same contract over the same data (PC14, adapter parity).
 */

export interface SeedIntensivo {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly teacherId: string | null;
  readonly agreedPercentageBp: number | null;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly status: IntensiveStatus;
  readonly updatedBy: string;
  readonly images: readonly CatalogImageRef[];
}

export interface CatalogSeed {
  readonly teachers: readonly Teacher[];
  readonly assets: readonly MediaAsset[];
  readonly intensivos: readonly SeedIntensivo[];
}

export const SEED_TEACHER_ID = "11111111-1111-4111-8111-111111111111";
export const SEED_ASSET_ID = "22222222-2222-4222-8222-222222222222";

const moneyOf = (centavos: number): Money => {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error("invalid seed amount");
  return money.value;
};

let nextIntensivo = 0;

/** A visible, upcoming intensivo; each call gets a fresh uuid and slug. */
export function seedIntensivo(
  overrides: Partial<SeedIntensivo> = {},
): SeedIntensivo {
  nextIntensivo += 1;
  const n = String(nextIntensivo).padStart(12, "0");
  return {
    id: `33333333-3333-4333-8333-${n}`,
    slug: `intensivo-${String(nextIntensivo)}`,
    name: "Intensivo Demo",
    summary: "Resumen del intensivo de demostración.",
    description: "Descripción del intensivo de demostración.",
    teacherId: null,
    agreedPercentageBp: null,
    eventDate: "2026-11-14",
    startsAt: "10:00",
    endsAt: "18:00",
    price: moneyOf(5_800_000),
    deposit: moneyOf(1_500_000),
    capacity: 12,
    minSeats: 4,
    policyText: "Política de demostración.",
    materialsIncluded: false,
    status: "published",
    updatedBy: "owner@example.com",
    images: [],
    ...overrides,
  };
}

export function buildSeed(overrides: Partial<CatalogSeed> = {}): CatalogSeed {
  return { teachers: [], assets: [], intensivos: [], ...overrides };
}

/** Values that must never appear in a public response (design PC14). */
export const PRIVACY_SENTINELS: readonly string[] = [
  "+54 9 351 000 0000",
  "docente@example.test",
  "third_party",
  "auditor@example.test",
  "SNAPSHOT-SENTINEL",
  "PRIVATE-FILE.jpg",
  "uploader@example.test",
];

/** Keys that must never appear in a serialized public response. */
export const PRIVATE_KEYS: readonly string[] = [
  "percentage",
  "basisPoints",
  "modality",
  "phone",
  "email",
  "audit",
  "updatedBy",
  "snapshot",
  "fileName",
  "createdBy",
];

/**
 * Every private field populated: a third-party teacher with a percentage,
 * contact data and audit trail, an image asset with private metadata, and a
 * draft whose text must stay out. `SNAPSHOT-SENTINEL` belongs to the taller
 * period snapshot (C4-B3); an intensivo has no snapshot to carry it.
 */
export function fullyPopulatedSeed(): CatalogSeed {
  return buildSeed({
    teachers: [
      buildTeacher({
        id: SEED_TEACHER_ID,
        name: "Lucía Demo",
        bioLine: "Ceramista de demostración.",
        phone: "+54 9 351 000 0000",
        email: "docente@example.test",
        modality: "third_party",
        audit: {
          updatedBy: "auditor@example.test",
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
      }),
    ],
    assets: [
      buildMediaAsset({
        id: SEED_ASSET_ID,
        fileName: "PRIVATE-FILE.jpg",
        src: `/imagenes/${SEED_ASSET_ID}.jpg`,
        createdBy: "uploader@example.test",
        width: 1200,
        height: 800,
      }),
    ],
    intensivos: [
      seedIntensivo({
        slug: "intensivo-demo",
        teacherId: SEED_TEACHER_ID,
        agreedPercentageBp: 3550,
        updatedBy: "auditor@example.test",
        images: [{ assetId: SEED_ASSET_ID, alt: "Manos en el torno" }],
      }),
      seedIntensivo({
        slug: "borrador-secreto",
        description: "DRAFT-ONLY-TEXT",
        status: "draft",
        teacherId: SEED_TEACHER_ID,
        agreedPercentageBp: 3550,
        updatedBy: "auditor@example.test",
      }),
    ],
  });
}

/** The teachers of a seed behind the lookup port; unknown ids are omitted. */
export function seedTeacherLookup(seed: CatalogSeed): TeacherLookup {
  return {
    findByIds: (ids) =>
      Promise.resolve(
        new Map(
          seed.teachers
            .filter((teacher) => ids.includes(teacher.id))
            .map((teacher) => [teacher.id, teacher]),
        ),
      ),
  };
}

/** The assets of a seed behind the lookup port; unknown ids are omitted. */
export function seedMediaLookup(seed: CatalogSeed): MediaLookup {
  return {
    findAssets: (ids) =>
      Promise.resolve(
        new Map(
          seed.assets
            .filter((asset) => ids.includes(asset.id))
            .map((asset) => [asset.id, asset]),
        ),
      ),
  };
}
