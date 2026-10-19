import {
  err,
  type Result,
  Money,
  type AdminFailure,
  type Audit,
  type Invalid,
  type NotFound,
  type RulesUnmet,
  type TransitionRefused,
} from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import type { TurnoLabelConflict } from "./turno-repository";
import type { ImageUse, ImageUseDraft } from "~/modules/media";

export interface Percentage {
  readonly basisPoints: number;
}
export function parsePercentage(
  text: string,
): Result<
  Percentage,
  "required" | "invalid-format" | "out-of-range" | "too-many-decimals"
> {
  const value = text.trim().replace(",", ".");
  if (!value) return err("required");
  if (!/^\d+(?:\.\d+)?$/.test(value)) return err("invalid-format");
  const [whole = "", fraction = ""] = value.split(".");
  if (fraction.length > 2) return err("too-many-decimals");
  // Integer arithmetic on the digits: Number("1.15") * 100 drifts.
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return basisPoints <= 10000
    ? { ok: true, value: { basisPoints } }
    : err("out-of-range");
}
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type LocalTime = string;
export type PeriodKey = string;
export function parsePeriodKey(
  text: string,
): Result<PeriodKey, "invalid-format"> {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text)
    ? { ok: true, value: text }
    : err("invalid-format");
}
export function cordobaMonthOf(instant: Date): PeriodKey {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
  }).format(instant);
}
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export type WorkshopStatus = "draft" | "published" | "paused" | "archived";
export type IntensiveStatus =
  "draft" | "published" | "paused" | "cancelled" | "archived";
export function isVisibleStatus(s: WorkshopStatus | IntensiveStatus): boolean {
  return s === "published" || s === "paused";
}
export function acceptsNewRequests(
  s: WorkshopStatus | IntensiveStatus,
): boolean {
  return s === "published";
}
export interface TeacherRef {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
}
export interface TeacherAssignment {
  readonly teacher: TeacherRef;
  readonly percentage: Percentage | null;
}
export interface Turno {
  readonly id: string;
  readonly label: string;
  readonly weekday: Weekday;
  readonly startsAt: LocalTime;
  readonly endsAt: LocalTime;
  readonly defaultCapacity: number;
  readonly active: boolean;
  readonly usedByPeriods: boolean;
}
export interface TurnoDraft {
  readonly label: string;
  readonly weekday: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly defaultCapacity: string;
}
export type TurnoField = "label" | "weekday" | "timeRange" | "defaultCapacity";
export interface MonthlyWorkshop {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly technique: string;
  readonly defaultFee: Money;
  readonly assignment: TeacherAssignment | null;
  readonly images: readonly ImageUse[];
  readonly status: WorkshopStatus;
  readonly turnos: readonly Turno[];
  readonly audit: Audit;
}
export interface MonthlyWorkshopSummary {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string | null;
  readonly status: WorkshopStatus;
  readonly activeTurnos: number;
  readonly acceptsNewRequests: boolean;
}
export interface MonthlyWorkshopDraft {
  readonly name: string;
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly technique: string;
  readonly defaultFee: string;
  readonly teacherId: string;
  readonly percentage: string;
  readonly images: readonly ImageUseDraft[];
  readonly confirmSlugChange: boolean;
}
export type MonthlyWorkshopField =
  | "name"
  | "slug"
  | "summary"
  | "description"
  | "technique"
  | "defaultFee"
  | "teacherId"
  | "percentage"
  | "images";
export type WorkshopPublishRule =
  "name" | "slug" | "teacher" | "percentage" | "default-fee" | "active-turno";
export type NamedRef = { readonly id: string; readonly name: string };
type R<T, E = never> = Promise<Result<T, AdminFailure | NotFound | E>>;
export interface MonthlyWorkshopsService {
  list(
    a: AdminActor,
    f: { readonly status: WorkshopStatus | "live" },
  ): Promise<Result<readonly MonthlyWorkshopSummary[], AdminFailure>>;
  listVisible(
    a: AdminActor,
  ): Promise<Result<readonly MonthlyWorkshopSummary[], AdminFailure>>;
  get(a: AdminActor, id: string): R<MonthlyWorkshop>;
  create(
    a: AdminActor,
    d: MonthlyWorkshopDraft,
  ): Promise<
    Result<MonthlyWorkshop, AdminFailure | Invalid<MonthlyWorkshopField>>
  >;
  update(
    a: AdminActor,
    id: string,
    d: MonthlyWorkshopDraft,
  ): R<MonthlyWorkshop, Invalid<MonthlyWorkshopField>>;
  delete(
    a: AdminActor,
    id: string,
  ): R<void, RulesUnmet<"draft-without-periods">>;
  publish(
    a: AdminActor,
    id: string,
  ): R<
    MonthlyWorkshop,
    TransitionRefused<WorkshopStatus> | RulesUnmet<WorkshopPublishRule>
  >;
  pause(
    a: AdminActor,
    id: string,
  ): R<MonthlyWorkshop, TransitionRefused<WorkshopStatus>>;
  archive(
    a: AdminActor,
    id: string,
  ): R<MonthlyWorkshop, TransitionRefused<WorkshopStatus>>;
  restore(
    a: AdminActor,
    id: string,
  ): R<MonthlyWorkshop, TransitionRefused<WorkshopStatus>>;
  addTurno(
    a: AdminActor,
    w: string,
    d: TurnoDraft,
  ): R<MonthlyWorkshop, Invalid<TurnoField>>;
  updateTurno(
    a: AdminActor,
    w: string,
    t: string,
    d: TurnoDraft,
  ): R<MonthlyWorkshop, Invalid<TurnoField>>;
  retireTurno(
    a: AdminActor,
    w: string,
    t: string,
  ): R<MonthlyWorkshop, RulesUnmet<"last-active-turno-of-published">>;
  reactivateTurno(
    a: AdminActor,
    w: string,
    t: string,
  ): R<MonthlyWorkshop, TurnoLabelConflict>;
  deleteTurno(
    a: AdminActor,
    w: string,
    t: string,
  ): R<
    MonthlyWorkshop,
    RulesUnmet<"turno-used" | "last-active-turno-of-published">
  >;
  listAssignmentsOfTeacher(
    a: AdminActor,
    id: string,
  ): Promise<
    Result<
      {
        readonly monthly: readonly NamedRef[];
        readonly intensives: readonly NamedRef[];
      },
      AdminFailure
    >
  >;
  techniqueSuggestions(
    a: AdminActor,
  ): Promise<Result<readonly string[], AdminFailure>>;
}
export type PeriodStatus = "draft" | "open" | "closed";
export interface PeriodSnapshot {
  readonly teacher: TeacherRef;
  readonly modality: "own" | "third_party";
  readonly percentage: Percentage | null;
}
export interface PeriodTurno {
  readonly turnoId: string;
  readonly label: string;
  readonly weekday: Weekday;
  readonly startsAt: LocalTime;
  readonly endsAt: LocalTime;
  readonly turnoActive: boolean;
  readonly capacity: number;
}
export interface EnabledMaterial {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly available: boolean;
}
export interface PeriodSummary {
  readonly id: string;
  readonly period: PeriodKey;
  readonly status: PeriodStatus;
  readonly fee: Money;
  readonly totalCapacity: number;
}
export interface WorkshopPeriod {
  readonly id: string;
  readonly workshopId: string;
  readonly period: PeriodKey;
  readonly fee: Money;
  readonly materialsRequired: boolean;
  readonly status: PeriodStatus;
  readonly project: {
    readonly title: string;
    readonly description: string;
    readonly images: readonly ImageUse[];
  };
  readonly turnos: readonly PeriodTurno[];
  readonly materials: readonly EnabledMaterial[];
  readonly snapshot: PeriodSnapshot;
  readonly openedBy: string;
  readonly openedAt: Date;
  readonly audit: Audit;
}
export interface WorkshopPeriodDraft {
  readonly fee: string;
  readonly materialsRequired: boolean;
  readonly projectTitle: string;
  readonly projectDescription: string;
  readonly projectImages: readonly ImageUseDraft[];
  readonly capacities: readonly {
    readonly turnoId: string;
    readonly capacity: string;
  }[];
  readonly snapshotPercentage: string;
  readonly materialIds: readonly string[];
}
export type PeriodField =
  | "period"
  | "fee"
  | "projectTitle"
  | "projectDescription"
  | "projectImages"
  | "capacities"
  | "snapshotPercentage"
  | "materialIds";
export type OpenMonthRule =
  "workshop-status" | "teacher" | "percentage" | "active-turno";
export interface IntensiveWorkshop {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly assignment: TeacherAssignment | null;
  readonly eventDate: string;
  readonly startsAt: LocalTime;
  readonly endsAt: LocalTime;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly images: readonly ImageUse[];
  readonly status: IntensiveStatus;
  readonly audit: Audit;
}
export interface IntensiveWorkshopDraft {
  readonly name: string;
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly teacherId: string;
  readonly percentage: string;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: string;
  readonly deposit: string;
  readonly capacity: string;
  readonly minSeats: string;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly images: readonly ImageUseDraft[];
}
export type IntensiveWorkshopField =
  | "name"
  | "slug"
  | "summary"
  | "description"
  | "teacherId"
  | "percentage"
  | "eventDate"
  | "timeRange"
  | "price"
  | "deposit"
  | "capacity"
  | "minSeats"
  | "policyText"
  | "images";
export type IntensivePublishRule =
  | "name"
  | "slug"
  | "teacher"
  | "percentage"
  | "time-range"
  | "future-start"
  | "price"
  | "deposit"
  | "capacity"
  | "min-seats";
export interface IntensivesService {
  list(
    a: AdminActor,
    f: { readonly status: IntensiveStatus | "live" },
  ): Promise<Result<readonly IntensiveWorkshop[], AdminFailure>>;
  listVisible(
    a: AdminActor,
  ): Promise<Result<readonly IntensiveWorkshop[], AdminFailure>>;
  get(a: AdminActor, id: string): R<IntensiveWorkshop>;
  create(
    a: AdminActor,
    d: IntensiveWorkshopDraft,
  ): Promise<
    Result<IntensiveWorkshop, AdminFailure | Invalid<IntensiveWorkshopField>>
  >;
  update(
    a: AdminActor,
    id: string,
    d: IntensiveWorkshopDraft,
  ): R<
    IntensiveWorkshop,
    Invalid<IntensiveWorkshopField> | RulesUnmet<IntensivePublishRule>
  >;
  delete(a: AdminActor, id: string): R<void, RulesUnmet<"draft-only">>;
  publish(
    a: AdminActor,
    id: string,
  ): R<
    IntensiveWorkshop,
    TransitionRefused<IntensiveStatus> | RulesUnmet<IntensivePublishRule>
  >;
  pause(
    a: AdminActor,
    id: string,
  ): R<IntensiveWorkshop, TransitionRefused<IntensiveStatus>>;
  cancel(
    a: AdminActor,
    id: string,
  ): R<IntensiveWorkshop, TransitionRefused<IntensiveStatus>>;
  archive(
    a: AdminActor,
    id: string,
  ): R<IntensiveWorkshop, TransitionRefused<IntensiveStatus>>;
  restore(
    a: AdminActor,
    id: string,
  ): R<IntensiveWorkshop, TransitionRefused<IntensiveStatus>>;
  reschedule(
    a: AdminActor,
    id: string,
    d: Pick<IntensiveWorkshopDraft, "eventDate" | "startsAt" | "endsAt">,
  ): R<IntensiveWorkshop, Invalid<"eventDate" | "timeRange">>;
}

export interface WorkshopPeriodsService {
  list(
    a: AdminActor,
    w: string,
  ): R<{
    readonly periods: readonly PeriodSummary[];
    readonly suggestedNext: PeriodKey | null;
  }>;
  get(a: AdminActor, w: string, p: PeriodKey): R<WorkshopPeriod>;
  openMonth(
    a: AdminActor,
    w: string,
    p: string,
  ): R<
    WorkshopPeriod,
    | Invalid<"period">
    | RulesUnmet<OpenMonthRule>
    | { readonly kind: "period-exists"; readonly periodId: string }
  >;
  update(
    a: AdminActor,
    id: string,
    d: WorkshopPeriodDraft,
  ): R<
    WorkshopPeriod,
    Invalid<PeriodField> | { readonly kind: "period-closed" }
  >;
  publish(
    a: AdminActor,
    id: string,
  ): R<WorkshopPeriod, TransitionRefused<PeriodStatus>>;
  close(
    a: AdminActor,
    id: string,
  ): R<WorkshopPeriod, TransitionRefused<PeriodStatus>>;
  delete(a: AdminActor, id: string): R<void, TransitionRefused<PeriodStatus>>;
}
