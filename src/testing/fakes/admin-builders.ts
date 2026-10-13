import type { MediaAsset, ImageUse } from "~/modules/media";
import type { Teacher } from "~/modules/teachers";
export const buildMediaAsset = (
  overrides: Partial<MediaAsset> = {},
): MediaAsset => ({
  id: "asset-1",
  fileName: "asset.jpg",
  src: "/imagenes/asset-1.jpg",
  contentType: "image/jpeg",
  byteSize: 1,
  width: 1,
  height: 1,
  createdBy: "owner@example.com",
  createdAt: new Date("2026-01-01"),
  ...overrides,
});
export const buildImageUse = (overrides: Partial<ImageUse> = {}): ImageUse => ({
  assetId: "asset-1",
  alt: "Imagen",
  asset: buildMediaAsset(),
  ...overrides,
});
export const buildTeacher = (overrides: Partial<Teacher> = {}): Teacher => ({
  id: "teacher-1",
  name: "Cami",
  bioLine: "",
  phone: null,
  email: null,
  modality: "own",
  active: true,
  audit: { updatedBy: "owner@example.com", updatedAt: new Date("2026-01-01") },
  ...overrides,
});
