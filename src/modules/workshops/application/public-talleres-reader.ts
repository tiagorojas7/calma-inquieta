import type { MediaAsset } from "~/modules/media";
import type { Teacher } from "~/modules/teachers";
import { INTENSIVE_LIMITS } from "../domain/intensive-core";
import {
  compareTalleres,
  compareTurnos,
  isPublicSlug,
  selectOffering,
} from "../domain/public-catalog-rules";
import { cordobaMonthOf, isVisibleStatus } from "./contracts";
import type {
  CreatePublicTalleresReader,
  ListOptions,
  PublicProject,
  PublicTaller,
  PublicTallerRecord,
  PublicTurno,
} from "./public-catalog";
import {
  projectImages,
  projectTeacher,
  publicStatus,
} from "./public-projection";

/**
 * Talleres and intensivos share change 3's slug limit (admin-catalog design
 * 5.7, "Slug | 80"), so no stored slug can exceed it and no visible activity
 * is ever refused (PC8).
 */
const SLUG_MAX_LENGTH = INTENSIVE_LIMITS.slug;

function assertLimit(options: ListOptions | undefined): number | undefined {
  const limit = options?.limit;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1))
    throw new RangeError("limit must be a positive integer");
  return limit;
}

type OpenPeriod = PublicTallerRecord["openPeriods"][number];

/** The assets a taller shows: its own gallery and the project of the selected period. */
function assetIdsOf(
  record: PublicTallerRecord,
  selected: OpenPeriod | null,
): string[] {
  return [
    ...record.images.map((image) => image.assetId),
    ...(selected?.project.images.map((image) => image.assetId) ?? []),
  ];
}

/** Real adapter errors propagate: a failure must not look like "nothing published" (PC3). */
export const createPublicTalleresReader: CreatePublicTalleresReader = ({
  records,
  teachers,
  media,
  clock,
}) => {
  async function project(
    found: readonly PublicTallerRecord[],
    currentPeriod: string,
  ): Promise<readonly PublicTaller[]> {
    const selections = found.map((record) =>
      selectOffering(record.openPeriods, currentPeriod),
    );
    const teacherIds = [
      ...new Set(
        found.flatMap((record) =>
          record.teacherId === null ? [] : [record.teacherId],
        ),
      ),
    ];
    const assetIds = [
      ...new Set(
        found.flatMap((record, index) =>
          assetIdsOf(record, selections[index] ?? null),
        ),
      ),
    ];
    const [teacherById, assetById] = await Promise.all([
      teacherIds.length === 0
        ? new Map<string, Teacher>()
        : teachers.findByIds(teacherIds),
      assetIds.length === 0
        ? new Map<string, MediaAsset>()
        : media.findAssets(assetIds),
    ]);
    return found.map((record, index) => {
      const selected = selections[index] ?? null;
      return projectTaller(record, selected, teacherById, assetById);
    });
  }

  return {
    async list(options) {
      const limit = assertLimit(options);
      const currentPeriod = cordobaMonthOf(clock.now());
      const found = await records.listVisible({ fromPeriod: currentPeriod });
      const ordered = found
        .filter((record) => isVisibleStatus(record.status))
        .sort(compareTalleres);
      return project(
        limit === undefined ? ordered : ordered.slice(0, limit),
        currentPeriod,
      );
    },

    async findBySlug(slug) {
      if (!isPublicSlug(slug, SLUG_MAX_LENGTH)) return null;
      const currentPeriod = cordobaMonthOf(clock.now());
      const record = await records.findVisibleBySlug(slug, {
        fromPeriod: currentPeriod,
      });
      if (record === null || !isVisibleStatus(record.status)) return null;
      const [projected] = await project([record], currentPeriod);
      return projected ?? null;
    },

    listSlugs: () => records.listVisibleSlugs(),
  };
};

/**
 * One taller read model (DA1, DA2): the turnos are the active ones; with an
 * offering only those the period holds, with that period's capacity, and
 * without one every active turno with capacity null. Built with literal keys.
 */
function projectTaller(
  record: PublicTallerRecord,
  selected: OpenPeriod | null,
  teacherById: ReadonlyMap<string, Teacher>,
  assetById: ReadonlyMap<string, MediaAsset>,
): PublicTaller {
  const capacityOf = new Map(
    selected?.capacities.map((c) => [c.turnoId, c.capacity]) ?? [],
  );
  const turnos: PublicTurno[] = record.activeTurnos
    .filter((turno) => selected === null || capacityOf.has(turno.id))
    .sort(compareTurnos)
    .map((turno) => ({
      label: turno.label,
      weekday: turno.weekday,
      startsAt: turno.startsAt,
      endsAt: turno.endsAt,
      seats: { capacity: capacityOf.get(turno.id) ?? null, available: null },
    }));
  return {
    slug: record.slug,
    name: record.name,
    summary: record.summary,
    description: record.description,
    technique: record.technique,
    teacher: projectTeacher(
      record.teacherId === null ? undefined : teacherById.get(record.teacherId),
    ),
    images: projectImages(record.images, assetById),
    status: publicStatus(record.status),
    turnos,
    offering:
      selected === null ? null : { period: selected.period, fee: selected.fee },
    project: projectOf(selected, assetById),
  };
}

/** Public only for the selected period and only when it has a title, a description or an image. */
function projectOf(
  selected: OpenPeriod | null,
  assetById: ReadonlyMap<string, MediaAsset>,
): PublicProject | null {
  if (selected === null) return null;
  const title = selected.project.title ?? "";
  const description = selected.project.description ?? "";
  const images = projectImages(selected.project.images, assetById);
  if (title.trim() === "" && description.trim() === "" && images.length === 0)
    return null;
  return { title, description, images };
}
