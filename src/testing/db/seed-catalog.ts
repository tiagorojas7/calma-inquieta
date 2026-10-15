import { mediaAsset } from "~/platform/db/schema/media";
import { teacher } from "~/platform/db/schema/teachers";
import {
  intensiveImage,
  intensiveWorkshop,
} from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import { teacherNameKey } from "~/modules/teachers/domain/teacher-core";
import type { CatalogSeed } from "../fakes/catalog-seed";

/** Inserts a `CatalogSeed` into the change-3 tables, parents before children. */
export async function seedCatalog(
  openSession: DbSessionFactory,
  seed: CatalogSeed,
): Promise<void> {
  const session = await openSession();
  try {
    const { db } = session;
    if (seed.teachers.length > 0)
      await db.insert(teacher).values(
        seed.teachers.map((row) => ({
          id: row.id,
          name: row.name,
          nameKey: teacherNameKey(row.name),
          bioLine: row.bioLine,
          phone: row.phone,
          email: row.email,
          modality: row.modality,
          active: row.active,
          updatedBy: row.audit.updatedBy,
          updatedAt: row.audit.updatedAt,
        })),
      );
    if (seed.assets.length > 0)
      await db.insert(mediaAsset).values(
        seed.assets.map((row) => ({
          id: row.id,
          storageKey: row.fileName,
          contentType: row.contentType,
          byteSize: row.byteSize,
          width: row.width,
          height: row.height,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
        })),
      );
    if (seed.intensivos.length > 0)
      await db.insert(intensiveWorkshop).values(
        seed.intensivos.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          summary: row.summary,
          description: row.description,
          teacherId: row.teacherId,
          agreedPercentageBp: row.agreedPercentageBp,
          eventDate: row.eventDate,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          priceCentavos: row.price.toCentavos(),
          depositCentavos: row.deposit.toCentavos(),
          capacity: row.capacity,
          minSeats: row.minSeats,
          policyText: row.policyText,
          materialsIncluded: row.materialsIncluded,
          status: row.status,
          updatedBy: row.updatedBy,
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        })),
      );
    const images = seed.intensivos.flatMap((row) =>
      row.images.map((image, position) => ({
        intensiveId: row.id,
        mediaAssetId: image.assetId,
        alt: image.alt,
        position,
      })),
    );
    if (images.length > 0) await db.insert(intensiveImage).values(images);
  } finally {
    await session.close();
  }
}
