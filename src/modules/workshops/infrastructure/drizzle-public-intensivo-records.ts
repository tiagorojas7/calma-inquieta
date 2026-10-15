import { and, asc, eq, gte, inArray, type SQL } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import {
  intensiveImage,
  intensiveWorkshop,
} from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  CatalogImageRef,
  PublicIntensivoRecord,
  PublicIntensivoRecords,
} from "../application/public-catalog";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

// An explicit column list: a column added to the table later never travels (PC14).
const COLUMNS = {
  id: intensiveWorkshop.id,
  slug: intensiveWorkshop.slug,
  name: intensiveWorkshop.name,
  summary: intensiveWorkshop.summary,
  description: intensiveWorkshop.description,
  teacherId: intensiveWorkshop.teacherId,
  eventDate: intensiveWorkshop.eventDate,
  startsAt: intensiveWorkshop.startsAt,
  endsAt: intensiveWorkshop.endsAt,
  priceCentavos: intensiveWorkshop.priceCentavos,
  depositCentavos: intensiveWorkshop.depositCentavos,
  capacity: intensiveWorkshop.capacity,
  minSeats: intensiveWorkshop.minSeats,
  policyText: intensiveWorkshop.policyText,
  materialsIncluded: intensiveWorkshop.materialsIncluded,
  status: intensiveWorkshop.status,
};

type Row = Pick<typeof intensiveWorkshop.$inferSelect, keyof typeof COLUMNS>;

function toMoney(centavos: number): Money {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error(`invalid stored amount ${String(centavos)}`);
  return money.value;
}

/** Postgres returns `HH:MM:SS`; the read model speaks `HH:MM`. */
const toClock = (time: string): string => time.slice(0, 5);

function toVisibleStatus(value: string): "published" | "paused" {
  if (value === "published" || value === "paused") return value;
  throw new Error(`status "${value}" is not visible`);
}

function toRecord(
  row: Row,
  images: readonly CatalogImageRef[],
): PublicIntensivoRecord {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    teacherId: row.teacherId,
    eventDate: row.eventDate,
    startsAt: toClock(row.startsAt),
    endsAt: toClock(row.endsAt),
    price: toMoney(row.priceCentavos),
    deposit: toMoney(row.depositCentavos),
    capacity: row.capacity,
    minSeats: row.minSeats,
    policyText: row.policyText,
    materialsIncluded: row.materialsIncluded,
    status: toVisibleStatus(row.status),
    images,
  };
}

const visible = (fromDate: string, extra?: SQL): SQL | undefined =>
  and(
    inArray(intensiveWorkshop.status, ["published", "paused"]),
    gte(intensiveWorkshop.eventDate, fromDate),
    extra,
  );

/** The gallery of each intensivo, in position order, in one statement. */
async function galleries(
  db: Db,
  ids: readonly string[],
): Promise<ReadonlyMap<string, CatalogImageRef[]>> {
  const byIntensivo = new Map<string, CatalogImageRef[]>();
  if (ids.length === 0) return byIntensivo;
  const rows = await db
    .select({
      intensiveId: intensiveImage.intensiveId,
      assetId: intensiveImage.mediaAssetId,
      alt: intensiveImage.alt,
    })
    .from(intensiveImage)
    .where(inArray(intensiveImage.intensiveId, [...ids]))
    .orderBy(asc(intensiveImage.intensiveId), asc(intensiveImage.position));
  for (const row of rows) {
    const gallery = byIntensivo.get(row.intensiveId) ?? [];
    gallery.push({ assetId: row.assetId, alt: row.alt });
    byIntensivo.set(row.intensiveId, gallery);
  }
  return byIntensivo;
}

/** One short-lived session per call; database errors propagate to the caller. */
export function createDrizzlePublicIntensivoRecords(
  openSession: DbSessionFactory,
): PublicIntensivoRecords {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  async function select(
    db: Db,
    where: SQL | undefined,
  ): Promise<readonly PublicIntensivoRecord[]> {
    const rows = await db
      .select(COLUMNS)
      .from(intensiveWorkshop)
      .where(where)
      .orderBy(asc(intensiveWorkshop.eventDate), asc(intensiveWorkshop.slug));
    const images = await galleries(
      db,
      rows.map((row) => row.id),
    );
    return rows.map((row) => toRecord(row, images.get(row.id) ?? []));
  }

  return {
    listVisible: ({ fromDate }) =>
      withSession((db) => select(db, visible(fromDate))),

    findVisibleBySlug: (slug, { fromDate }) =>
      withSession(async (db) => {
        const [record] = await select(
          db,
          visible(fromDate, eq(intensiveWorkshop.slug, slug)),
        );
        return record ?? null;
      }),

    listVisibleSlugs: ({ fromDate }) =>
      withSession(async (db) => {
        const rows = await db
          .select({ slug: intensiveWorkshop.slug })
          .from(intensiveWorkshop)
          .where(visible(fromDate))
          .orderBy(
            asc(intensiveWorkshop.eventDate),
            asc(intensiveWorkshop.slug),
          );
        return rows.map((row) => row.slug);
      }),
  };
}
