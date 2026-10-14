import { inArray } from "drizzle-orm";
import { mediaAsset } from "~/platform/db/schema/media";
import type { DbSessionFactory } from "~/platform/db/session";
import type { MediaAssetRepository } from "../application/media-assets";
import type { MediaAsset } from "../application/read-models";
import type { ImageContentType } from "../domain/media-core";

const KEY_PREFIX = "img/";

function toAsset(row: typeof mediaAsset.$inferSelect): MediaAsset {
  const fileName = row.storageKey.slice(KEY_PREFIX.length);
  return {
    id: row.id,
    fileName,
    src: `/imagenes/${fileName}`,
    contentType: row.contentType as ImageContentType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

/** One short-lived session per call; database errors propagate to the caller. */
export function createDrizzleMediaAssetRepository(
  openSession: DbSessionFactory,
): MediaAssetRepository {
  return {
    async insert(asset) {
      const session = await openSession();
      try {
        await session.db.insert(mediaAsset).values({
          id: asset.id,
          storageKey: `${KEY_PREFIX}${asset.fileName}`,
          contentType: asset.contentType,
          byteSize: asset.byteSize,
          width: asset.width,
          height: asset.height,
          createdBy: asset.createdBy,
          createdAt: asset.createdAt,
        });
      } finally {
        await session.close();
      }
    },

    async findByIds(ids) {
      if (ids.length === 0) return new Map();
      const session = await openSession();
      try {
        const rows = await session.db
          .select()
          .from(mediaAsset)
          .where(inArray(mediaAsset.id, [...ids]));
        return new Map(rows.map((row) => [row.id, toAsset(row)]));
      } finally {
        await session.close();
      }
    },
  };
}
