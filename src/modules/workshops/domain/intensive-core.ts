import {
  err,
  ok,
  parseWholePesos,
  type FieldIssue,
  type Invalid,
  Money,
  type Result,
  type TransitionRefused,
} from "~/modules/_shared";

export type IntensiveLifecycle =
  "draft" | "published" | "paused" | "cancelled" | "archived";
export type AssignmentModality = "own" | "third_party";

export const INTENSIVE_LIMITS = {
  name: 120,
  slug: 80,
  summary: 200,
  description: 5000,
  policyText: 2000,
  maxCapacity: 500,
} as const;

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;
const COUNT_FORMAT = /^\d+$/;
const ZERO = Money.zero();

/** One local Córdoba date plus two local times: a single date by construction. */
export interface IntensiveSchedule {
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface IntensiveCoreDraft extends IntensiveSchedule {
  readonly name: string;
  /** Already derived from the name when the admin left it blank. */
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly price: string;
  readonly deposit: string;
  readonly capacity: string;
  readonly minSeats: string;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
}

export type ScheduleField = "eventDate" | "timeRange";
export type IntensiveCoreField =
  | ScheduleField
  | "name"
  | "slug"
  | "summary"
  | "description"
  | "price"
  | "deposit"
  | "capacity"
  | "minSeats"
  | "policyText";

/** The validated, trimmed fields of an intensivo (assignment and gallery excluded). */
export interface IntensiveCore {
  readonly name: string;
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly schedule: IntensiveSchedule;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
}

function isRealDate(text: string): boolean {
  const match = DATE_FORMAT.exec(text);
  if (!match) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return false;
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function validateSchedule(
  input: IntensiveSchedule,
): Result<IntensiveSchedule, Invalid<ScheduleField>> {
  const eventDate = input.eventDate.trim();
  const startsAt = input.startsAt.trim();
  const endsAt = input.endsAt.trim();
  const issues: FieldIssue<ScheduleField>[] = [];
  if (eventDate === "") issues.push({ field: "eventDate", code: "required" });
  else if (!isRealDate(eventDate))
    issues.push({ field: "eventDate", code: "invalid-format" });
  if (startsAt === "" || endsAt === "")
    issues.push({ field: "timeRange", code: "required" });
  else if (!TIME_FORMAT.test(startsAt) || !TIME_FORMAT.test(endsAt))
    issues.push({ field: "timeRange", code: "invalid-format" });
  else if (endsAt <= startsAt)
    issues.push({ field: "timeRange", code: "end-before-start" });
  return issues.length > 0
    ? err({ kind: "invalid", issues })
    : ok({ eventDate, startsAt, endsAt });
}

/** The Córdoba wall clock (date and minute) of an instant. */
export function cordobaLocalOf(instant: Date): {
  readonly date: string;
  readonly time: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** True when the start is strictly after the current Córdoba minute. */
export function startsInFuture(
  schedule: IntensiveSchedule,
  now: Date,
): boolean {
  const local = cordobaLocalOf(now);
  return (
    `${schedule.eventDate}T${schedule.startsAt}` > `${local.date}T${local.time}`
  );
}

type CountCode = "required" | "invalid-format" | "out-of-range";

function parseCount(
  text: string,
  min: number,
  max: number,
): Result<number, CountCode> {
  if (text === "") return err("required");
  if (!COUNT_FORMAT.test(text)) return err("invalid-format");
  const value = Number(text);
  return value >= min && value <= max ? ok(value) : err("out-of-range");
}

function requiredText(
  field: "name" | "summary" | "description",
  text: string,
  limit: number,
  issues: FieldIssue<IntensiveCoreField>[],
): void {
  if (text === "") issues.push({ field, code: "required" });
  else if (text.length > limit) issues.push({ field, code: "too-long" });
}

export function validateIntensiveCore(
  draft: IntensiveCoreDraft,
): Result<IntensiveCore, Invalid<IntensiveCoreField>> {
  const name = draft.name.trim();
  const slug = draft.slug.trim();
  const summary = draft.summary.trim();
  const description = draft.description.trim();
  const policyText = draft.policyText.trim();
  const issues: FieldIssue<IntensiveCoreField>[] = [];

  requiredText("name", name, INTENSIVE_LIMITS.name, issues);
  if (slug === "") issues.push({ field: "slug", code: "required" });
  else if (slug.length > INTENSIVE_LIMITS.slug)
    issues.push({ field: "slug", code: "too-long" });
  else if (!SLUG_FORMAT.test(slug))
    issues.push({ field: "slug", code: "invalid-format" });
  requiredText("summary", summary, INTENSIVE_LIMITS.summary, issues);
  requiredText(
    "description",
    description,
    INTENSIVE_LIMITS.description,
    issues,
  );

  const schedule = validateSchedule(draft);
  if (!schedule.ok) issues.push(...schedule.error.issues);

  const price = parseWholePesos(draft.price.trim());
  if (!price.ok) issues.push({ field: "price", code: price.error });
  else if (price.value.compare(ZERO) <= 0)
    issues.push({ field: "price", code: "out-of-range" });
  const deposit = parseWholePesos(draft.deposit.trim());
  if (!deposit.ok) issues.push({ field: "deposit", code: deposit.error });
  else if (deposit.value.compare(ZERO) <= 0)
    issues.push({ field: "deposit", code: "out-of-range" });
  else if (price.ok && deposit.value.compare(price.value) > 0)
    issues.push({ field: "deposit", code: "exceeds-price" });

  const capacity = parseCount(
    draft.capacity.trim(),
    1,
    INTENSIVE_LIMITS.maxCapacity,
  );
  if (!capacity.ok) issues.push({ field: "capacity", code: capacity.error });
  const minSeats = parseCount(
    draft.minSeats.trim(),
    1,
    Number.MAX_SAFE_INTEGER,
  );
  if (!minSeats.ok) issues.push({ field: "minSeats", code: minSeats.error });
  else if (capacity.ok && minSeats.value > capacity.value)
    issues.push({ field: "minSeats", code: "exceeds-capacity" });

  if (policyText.length > INTENSIVE_LIMITS.policyText)
    issues.push({ field: "policyText", code: "too-long" });

  if (
    issues.length > 0 ||
    !schedule.ok ||
    !price.ok ||
    !deposit.ok ||
    !capacity.ok ||
    !minSeats.ok
  )
    return err({ kind: "invalid", issues });
  return ok({
    name,
    slug,
    summary,
    description,
    schedule: schedule.value,
    price: price.value,
    deposit: deposit.value,
    capacity: capacity.value,
    minSeats: minSeats.value,
    policyText,
    materialsIncluded: draft.materialsIncluded,
  });
}

export type PercentageSubmission =
  | { readonly kind: "blank" }
  | {
      readonly kind: "invalid";
      readonly code: "invalid-format" | "out-of-range" | "too-many-decimals";
    }
  | { readonly kind: "value"; readonly basisPoints: number };

/**
 * The percentage an assignment stores. A third-party teacher needs one; an own
 * teacher takes none and a submitted value is refused, never silently dropped.
 */
export function assignmentPercentage(
  modality: AssignmentModality,
  submission: PercentageSubmission,
): Result<number | null, FieldIssue<"percentage">> {
  if (modality === "own")
    return submission.kind === "blank"
      ? ok(null)
      : err({ field: "percentage", code: "percentage-not-applicable" });
  if (submission.kind === "blank")
    return err({ field: "percentage", code: "required" });
  if (submission.kind === "invalid")
    return err({ field: "percentage", code: submission.code });
  return ok(submission.basisPoints);
}

const TRANSITIONS: Readonly<
  Record<IntensiveLifecycle, readonly IntensiveLifecycle[]>
> = {
  draft: ["published", "archived"],
  published: ["paused", "cancelled", "archived"],
  paused: ["published", "cancelled", "archived"],
  cancelled: ["archived"],
  archived: ["draft"],
};

export function checkTransition(
  from: IntensiveLifecycle,
  to: IntensiveLifecycle,
): Result<IntensiveLifecycle, TransitionRefused<IntensiveLifecycle>> {
  return TRANSITIONS[from].includes(to)
    ? ok(to)
    : err({ kind: "transition-refused", from, to });
}

export type PublishRuleName =
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

export interface PublishFacts {
  readonly name: string;
  readonly slug: string;
  readonly schedule: IntensiveSchedule;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly assignment: {
    readonly active: boolean;
    readonly modality: AssignmentModality;
    readonly percentageBp: number | null;
  } | null;
}

/**
 * Every publish rule the stored facts fail, in a fixed order. A start not
 * strictly after the current Córdoba minute fails `future-start`.
 */
export function unmetPublishRules(
  facts: PublishFacts,
  now: Date,
): readonly PublishRuleName[] {
  return collectUnmetRules(facts, now);
}

/**
 * The publish rules a published or paused intensivo must keep satisfying
 * while it is edited: all of them except `future-start`. An event that
 * already started stays editable; a schedule change is guarded separately.
 */
export function unmetEditRules(
  facts: PublishFacts,
): readonly PublishRuleName[] {
  return collectUnmetRules(facts, null);
}

function collectUnmetRules(
  facts: PublishFacts,
  now: Date | null,
): readonly PublishRuleName[] {
  const unmet: PublishRuleName[] = [];
  const name = facts.name.trim();
  if (name === "" || name.length > INTENSIVE_LIMITS.name) unmet.push("name");
  if (
    !SLUG_FORMAT.test(facts.slug) ||
    facts.slug.length > INTENSIVE_LIMITS.slug
  )
    unmet.push("slug");
  if (!facts.assignment?.active) unmet.push("teacher");
  else if (
    facts.assignment.modality === "third_party" &&
    facts.assignment.percentageBp === null
  )
    unmet.push("percentage");
  if (!validateSchedule(facts.schedule).ok) unmet.push("time-range");
  else if (now !== null && !startsInFuture(facts.schedule, now))
    unmet.push("future-start");
  if (facts.price.compare(ZERO) <= 0) unmet.push("price");
  if (
    facts.deposit.compare(ZERO) <= 0 ||
    facts.deposit.compare(facts.price) > 0
  )
    unmet.push("deposit");
  const capacityOk =
    Number.isInteger(facts.capacity) &&
    facts.capacity >= 1 &&
    facts.capacity <= INTENSIVE_LIMITS.maxCapacity;
  if (!capacityOk) unmet.push("capacity");
  if (
    !Number.isInteger(facts.minSeats) ||
    facts.minSeats < 1 ||
    facts.minSeats > facts.capacity
  )
    unmet.push("min-seats");
  return unmet;
}
