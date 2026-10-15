import type { MediaAsset } from "~/modules/media";
import type { Teacher } from "~/modules/teachers";
import { INTENSIVE_LIMITS } from "../domain/intensive-core";
import {
  compareIntensivos,
  isPublicSlug,
  isUpcoming,
} from "../domain/public-catalog-rules";
import { isVisibleStatus } from "./contracts";
import { cordobaDateOf } from "./cordoba-time";
import type {
  CreatePublicIntensivosReader,
  ListOptions,
  PublicIntensivo,
  PublicIntensivoRecord,
} from "./public-catalog";
import {
  projectImages,
  projectTeacher,
  publicStatus,
} from "./public-projection";

/**
 * The slug limit of an intensivo is change 3's (admin-catalog design 5.7), so
 * no stored slug can exceed it and no visible activity is ever refused (PC8).
 */
const SLUG_MAX_LENGTH = INTENSIVE_LIMITS.slug;

function assertLimit(options: ListOptions | undefined): number | undefined {
  const limit = options?.limit;
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1))
    throw new RangeError("limit must be a positive integer");
  return limit;
}

/** Defense in depth: a port that over-returns cannot leak a hidden intensivo. */
const isPublic = (record: PublicIntensivoRecord, today: string): boolean =>
  isVisibleStatus(record.status) && isUpcoming(record.eventDate, today);

/** Real adapter errors propagate: a failure must not look like "nothing published" (PC3). */
export const createPublicIntensivosReader: CreatePublicIntensivosReader = ({
  records,
  teachers,
  media,
  clock,
}) => {
  async function project(
    selected: readonly PublicIntensivoRecord[],
  ): Promise<readonly PublicIntensivo[]> {
    const teacherIds = [
      ...new Set(
        selected.flatMap((record) =>
          record.teacherId === null ? [] : [record.teacherId],
        ),
      ),
    ];
    const assetIds = [
      ...new Set(
        selected.flatMap((record) => record.images.map((i) => i.assetId)),
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
    return selected.map((record) => ({
      slug: record.slug,
      name: record.name,
      summary: record.summary,
      description: record.description,
      teacher: projectTeacher(
        record.teacherId === null
          ? undefined
          : teacherById.get(record.teacherId),
      ),
      date: record.eventDate,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      price: record.price,
      deposit: record.deposit,
      minSeats: record.minSeats,
      policyText: record.policyText,
      materialsIncluded: record.materialsIncluded,
      images: projectImages(record.images, assetById),
      status: publicStatus(record.status),
      seats: { capacity: record.capacity, available: null },
    }));
  }

  return {
    async list(options) {
      const limit = assertLimit(options);
      const today = cordobaDateOf(clock.now());
      const found = await records.listVisible({ fromDate: today });
      const ordered = found
        .filter((record) => isPublic(record, today))
        .sort(compareIntensivos);
      return project(limit === undefined ? ordered : ordered.slice(0, limit));
    },

    async findBySlug(slug) {
      if (!isPublicSlug(slug, SLUG_MAX_LENGTH)) return null;
      const today = cordobaDateOf(clock.now());
      const record = await records.findVisibleBySlug(slug, { fromDate: today });
      if (record === null || !isPublic(record, today)) return null;
      const [projected] = await project([record]);
      return projected ?? null;
    },

    listSlugs: () =>
      records.listVisibleSlugs({ fromDate: cordobaDateOf(clock.now()) }),
  };
};
