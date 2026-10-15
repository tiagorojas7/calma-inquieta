import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import { err, Money, ok } from "~/modules/_shared";
import {
  intensiveImage,
  intensiveWorkshop,
} from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import type { IntensiveStatus } from "../application/contracts";
import type {
  IntensiveRepository,
  StoredIntensive,
} from "../application/intensive-repository";

type Row = typeof intensiveWorkshop.$inferSelect;
type ImageRow = typeof intensiveImage.$inferSelect;
type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
type Gallery = StoredIntensive["images"];

const SLUG_INDEX = "intensive_workshop_slug_unique";
const STATUSES: readonly IntensiveStatus[] = [
  "draft",
  "published",
  "paused",
  "cancelled",
  "archived",
];

function toStatus(value: string): IntensiveStatus {
  const status = STATUSES.find((candidate) => candidate === value);
  if (status === undefined) throw new Error(`unknown status "${value}"`);
  return status;
}

function toMoney(centavos: number): Money {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error(`invalid stored amount ${String(centavos)}`);
  return money.value;
}

/** Postgres returns `HH:MM:SS`; the domain speaks `HH:MM`. */
const toClock = (time: string): string => time.slice(0, 5);

function toStored(row: Row, images: Gallery): StoredIntensive {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    teacherId: row.teacherId,
    percentage:
      row.agreedPercentageBp === null
        ? null
        : { basisPoints: row.agreedPercentageBp },
    eventDate: row.eventDate,
    startsAt: toClock(row.startsAt),
    endsAt: toClock(row.endsAt),
    price: toMoney(row.priceCentavos),
    deposit: toMoney(row.depositCentavos),
    capacity: row.capacity,
    minSeats: row.minSeats,
    policyText: row.policyText,
    materialsIncluded: row.materialsIncluded,
    images,
    status: toStatus(row.status),
    audit: { updatedBy: row.updatedBy, updatedAt: row.updatedAt },
  };
}

function toValues(value: StoredIntensive) {
  return {
    slug: value.slug,
    name: value.name,
    summary: value.summary,
    description: value.description,
    teacherId: value.teacherId,
    agreedPercentageBp: value.percentage?.basisPoints ?? null,
    eventDate: value.eventDate,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    priceCentavos: value.price.toCentavos(),
    depositCentavos: value.deposit.toCentavos(),
    capacity: value.capacity,
    minSeats: value.minSeats,
    policyText: value.policyText,
    materialsIncluded: value.materialsIncluded,
    status: value.status,
    updatedBy: value.audit.updatedBy,
    updatedAt: value.audit.updatedAt,
  };
}

/** Walks the error cause chain for SQLSTATE 23505 on the slug unique index. */
function isSlugConflict(error: unknown): boolean {
  const visited = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null) {
    if (visited.has(current)) return false;
    visited.add(current);
    try {
      if (
        "code" in current &&
        current.code === "23505" &&
        "constraint" in current &&
        current.constraint === SLUG_INDEX
      )
        return true;
      current = "cause" in current ? current.cause : undefined;
    } catch {
      return false;
    }
  }
  return false;
}

function galleryRows(value: StoredIntensive) {
  return value.images.map((image, position) => ({
    intensiveId: value.id,
    mediaAssetId: image.assetId,
    alt: image.alt,
    position,
  }));
}

function groupGalleries(
  rows: readonly ImageRow[],
): Map<string, Gallery[number][]> {
  const byIntensive = new Map<string, Gallery[number][]>();
  for (const row of rows) {
    const gallery = byIntensive.get(row.intensiveId) ?? [];
    gallery.push({ assetId: row.mediaAssetId, alt: row.alt });
    byIntensive.set(row.intensiveId, gallery);
  }
  return byIntensive;
}

async function hydrate(
  db: Db,
  rows: readonly Row[],
): Promise<readonly StoredIntensive[]> {
  if (rows.length === 0) return [];
  const images = await db
    .select()
    .from(intensiveImage)
    .where(
      inArray(
        intensiveImage.intensiveId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(intensiveImage.position));
  const galleries = groupGalleries(images);
  return rows.map((row) => toStored(row, galleries.get(row.id) ?? []));
}

/**
 * One short-lived session per call. A write is one transaction (the row plus
 * the whole gallery); only the slug unique index becomes a typed result, every
 * other database error propagates.
 */
export function createDrizzleIntensiveRepository(
  openSession: DbSessionFactory,
): IntensiveRepository {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  async function findOne(where: SQL): Promise<StoredIntensive | null> {
    return withSession(async (db) => {
      const rows = await db.select().from(intensiveWorkshop).where(where);
      return (await hydrate(db, rows))[0] ?? null;
    });
  }

  return {
    insert: (value) =>
      withSession(async (db) => {
        try {
          await db.transaction(async (tx) => {
            await tx
              .insert(intensiveWorkshop)
              .values({ id: value.id, ...toValues(value) });
            const images = galleryRows(value);
            if (images.length > 0)
              await tx.insert(intensiveImage).values(images);
          });
          return ok(undefined);
        } catch (error) {
          if (isSlugConflict(error)) return err({ kind: "slug-conflict" });
          throw error;
        }
      }),

    update: (value) =>
      withSession(async (db) => {
        try {
          return await db.transaction(async (tx) => {
            const rows = await tx
              .update(intensiveWorkshop)
              .set(toValues(value))
              .where(eq(intensiveWorkshop.id, value.id))
              .returning({ id: intensiveWorkshop.id });
            if (rows.length === 0) return err({ kind: "not-found" });
            await tx
              .delete(intensiveImage)
              .where(eq(intensiveImage.intensiveId, value.id));
            const images = galleryRows(value);
            if (images.length > 0)
              await tx.insert(intensiveImage).values(images);
            return ok(undefined);
          });
        } catch (error) {
          if (isSlugConflict(error)) return err({ kind: "slug-conflict" });
          throw error;
        }
      }),

    findById: (id) => findOne(eq(intensiveWorkshop.id, id)),

    findBySlug: (slug) => findOne(eq(intensiveWorkshop.slug, slug)),

    async list(statuses) {
      if (statuses.length === 0) return [];
      return withSession(async (db) => {
        const rows = await db
          .select()
          .from(intensiveWorkshop)
          .where(inArray(intensiveWorkshop.status, [...statuses]))
          .orderBy(
            desc(intensiveWorkshop.eventDate),
            desc(intensiveWorkshop.startsAt),
            asc(intensiveWorkshop.id),
          );
        return hydrate(db, rows);
      });
    },

    deleteDraft: (id) =>
      withSession((db) =>
        db.transaction(async (tx) => {
          const deleted = await tx
            .delete(intensiveWorkshop)
            .where(
              and(
                eq(intensiveWorkshop.id, id),
                eq(intensiveWorkshop.status, "draft"),
              ),
            )
            .returning({ id: intensiveWorkshop.id });
          if (deleted.length > 0) return "deleted";
          const remaining = await tx
            .select({ id: intensiveWorkshop.id })
            .from(intensiveWorkshop)
            .where(eq(intensiveWorkshop.id, id));
          return remaining.length > 0 ? "not-draft" : "not-found";
        }),
      ),
  };
}
