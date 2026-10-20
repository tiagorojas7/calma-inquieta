import { mediaAsset } from "~/platform/db/schema/media";
import { teacher } from "~/platform/db/schema/teachers";
import {
  intensiveImage,
  intensiveWorkshop,
  monthlyWorkshop,
  periodTurno,
  workshopPeriod,
  workshopTurno,
} from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import { teacherNameKey } from "~/modules/teachers/domain/teacher-core";
import { turnoLabelKey } from "~/modules/workshops/domain/turno-core";
import { buildTeacher } from "../fakes/admin-builders";
import type { CatalogSeed } from "../fakes/catalog-seed";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

async function seedTalleres(db: Db, seed: CatalogSeed): Promise<void> {
  const when = new Date("2026-01-01T00:00:00Z");
  if (seed.talleres.length === 0) return;
  await db.insert(monthlyWorkshop).values(
    seed.talleres.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      summary: row.summary,
      description: row.description,
      technique: row.technique,
      defaultFeeCentavos: row.defaultFee.toCentavos(),
      teacherId: row.teacherId,
      agreedPercentageBp: row.agreedPercentageBp,
      status: row.status,
      updatedBy: row.updatedBy,
      updatedAt: when,
    })),
  );
  const turnos = seed.talleres.flatMap((row) =>
    row.turnos.map((turno) => ({
      id: turno.id,
      workshopId: row.id,
      label: turno.label,
      labelKey: turnoLabelKey(turno.label),
      weekday: turno.weekday,
      startsAt: turno.startsAt,
      endsAt: turno.endsAt,
      defaultCapacity: turno.defaultCapacity,
      active: turno.active,
    })),
  );
  if (turnos.length > 0) await db.insert(workshopTurno).values(turnos);
  const periods = seed.talleres.flatMap((row) =>
    row.periods.map((period) => ({ workshopId: row.id, period })),
  );
  if (periods.length === 0) return;
  await db.insert(workshopPeriod).values(
    periods.map(({ workshopId, period }) => ({
      id: period.id,
      workshopId,
      period: period.period,
      feeCentavos: period.fee.toCentavos(),
      materialsRequired: false,
      projectTitle: period.projectTitle,
      projectDescription: period.projectDescription,
      snapshotTeacherId: period.snapshotTeacherId,
      snapshotTeacherName: period.snapshotTeacherName,
      snapshotTeacherModality: period.snapshotTeacherModality,
      snapshotPercentageBp: period.snapshotPercentageBp,
      status: period.status,
      openedBy: "owner@example.com",
      openedAt: when,
      updatedBy: "owner@example.com",
      updatedAt: when,
    })),
  );
  const capacities = periods.flatMap(({ workshopId, period }) =>
    period.capacities.map((capacity) => ({
      periodId: period.id,
      turnoId: capacity.turnoId,
      workshopId,
      capacity: capacity.capacity,
    })),
  );
  if (capacities.length > 0) await db.insert(periodTurno).values(capacities);
}

/**
 * Inserts a `CatalogSeed` into the change-3 tables, parents before children.
 * Workshop and project images are not inserted: the schema has no table for
 * them yet (B5 and B6b), so the Drizzle taller records return empty galleries.
 * A period whose teacher snapshot points at a teacher the seed does not hold
 * gets a placeholder teacher row, because the foreign key requires one.
 */
export async function seedCatalog(
  openSession: DbSessionFactory,
  seed: CatalogSeed,
): Promise<void> {
  const session = await openSession();
  try {
    const { db } = session;
    const knownTeachers = new Set(seed.teachers.map((row) => row.id));
    const snapshotOnly = [
      ...new Set(
        seed.talleres.flatMap((taller) =>
          taller.periods.map((period) => period.snapshotTeacherId),
        ),
      ),
    ].filter((id) => !knownTeachers.has(id));
    const teachers = [
      ...seed.teachers,
      ...snapshotOnly.map((id) => buildTeacher({ id, name: `Docente ${id}` })),
    ];
    if (teachers.length > 0)
      await db.insert(teacher).values(
        teachers.map((row) => ({
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
    await seedTalleres(db, seed);
  } finally {
    await session.close();
  }
}
