import type { MediaAsset, ImageUse } from "~/modules/media";
import type { Teacher } from "~/modules/teachers";
import type {
  MonthlyWorkshop,
  Turno,
  WorkshopPeriod,
} from "~/modules/workshops";
import { Money } from "~/modules/_shared";
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
const testMoney = Money.fromCentavos(100);
if (!testMoney.ok) throw new Error("invalid test money");
export const buildTurno = (overrides: Partial<Turno> = {}): Turno => ({
  id: "turno-1",
  label: "Lunes",
  weekday: 1,
  startsAt: "10:00",
  endsAt: "12:00",
  defaultCapacity: 10,
  active: true,
  usedByPeriods: false,
  ...overrides,
});
export const buildMonthlyWorkshop = (
  overrides: Partial<MonthlyWorkshop> = {},
): MonthlyWorkshop => ({
  id: "workshop-1",
  slug: "taller",
  name: "Taller",
  summary: "Resumen",
  description: "Descripción",
  technique: "Técnica",
  defaultFee: testMoney.value,
  assignment: null,
  images: [],
  status: "draft",
  turnos: [],
  audit: { updatedBy: "owner@example.com", updatedAt: new Date("2026-01-01") },
  ...overrides,
});
export const buildWorkshopPeriod = (
  overrides: Partial<WorkshopPeriod> = {},
): WorkshopPeriod => ({
  id: "period-1",
  workshopId: "workshop-1",
  period: "2026-01",
  fee: buildMonthlyWorkshop().defaultFee,
  materialsRequired: false,
  status: "draft",
  project: { title: "Proyecto", description: "", images: [] },
  turnos: [],
  materials: [],
  snapshot: {
    teacher: { id: "teacher-1", name: "Cami", active: true },
    modality: "own",
    percentage: null,
  },
  openedBy: "owner@example.com",
  openedAt: new Date("2026-01-01"),
  audit: { updatedBy: "owner@example.com", updatedAt: new Date("2026-01-01") },
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
