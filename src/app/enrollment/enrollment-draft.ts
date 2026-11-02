import type { Result } from "~/modules/_shared";
import {
  addToCart,
  buildCart,
  MAX_LINE_QUANTITY,
  MIN_LINE_QUANTITY,
  type CartError,
  type CartLine,
} from "~/modules/enrollments";

const KEY_PREFIX = "enrollment-draft:";

export interface EnrollmentStudentDraft {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly turnoId: string;
  readonly period: string;
  readonly policyAccepted: boolean;
}

export interface EnrollmentDraft {
  readonly student: EnrollmentStudentDraft;
  readonly lines: readonly CartLine[];
}

export interface StoredEnrollmentDraft {
  readonly slug: string;
  readonly draft: EnrollmentDraft;
}

interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function keyFor(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

function isStudent(value: unknown): value is EnrollmentStudentDraft {
  if (typeof value !== "object" || value === null) return false;
  const student = value as Record<string, unknown>;
  return (
    typeof student.fullName === "string" &&
    typeof student.email === "string" &&
    typeof student.phone === "string" &&
    typeof student.turnoId === "string" &&
    typeof student.period === "string" &&
    student.policyAccepted === true
  );
}

function isLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.materialId === "string" &&
    typeof line.variantId === "string" &&
    typeof line.quantity === "number"
  );
}

export function loadEnrollmentDraft(
  storage: DraftStorage,
  slug: string,
): EnrollmentDraft | null {
  try {
    const raw = storage.getItem(keyFor(slug));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as { student?: unknown; lines?: unknown };
    if (!isStudent(candidate.student) || !Array.isArray(candidate.lines))
      return null;
    if (!candidate.lines.every(isLine)) return null;
    const cart = buildCart(candidate.lines);
    return cart.ok ? { student: candidate.student, lines: cart.value } : null;
  } catch {
    return null;
  }
}

export function saveEnrollmentDraft(
  storage: DraftStorage,
  slug: string,
  draft: EnrollmentDraft,
): void {
  storage.setItem(keyFor(slug), JSON.stringify(draft));
}

export function selectEnrollmentDraft(
  stored: StoredEnrollmentDraft | null,
  slug: string,
  period: string,
): EnrollmentDraft | null {
  return stored?.slug === slug && stored.draft.student.period === period
    ? stored.draft
    : null;
}

export function addDraftLine(
  draft: EnrollmentDraft,
  line: CartLine,
): Result<EnrollmentDraft, CartError> {
  const cart = addToCart(draft.lines, line);
  return cart.ok ? { ok: true, value: { ...draft, lines: cart.value } } : cart;
}

/**
 * Chooses one measure of a product: the product's other lines are dropped and
 * the chosen measure is added with the given quantity.
 */
export function selectDraftVariant(
  draft: EnrollmentDraft,
  materialId: string,
  variantId: string,
  quantity: number,
): Result<EnrollmentDraft, CartError> {
  return addDraftLine(
    {
      ...draft,
      lines: draft.lines.filter((line) => line.materialId !== materialId),
    },
    { materialId, variantId, quantity },
  );
}

/**
 * Sets the quantity of an existing line (no merging): below the minimum the
 * line is removed, above the maximum it is clamped. Unknown variants and
 * non-integer quantities leave the draft as it is.
 */
export function setDraftLineQuantity(
  draft: EnrollmentDraft,
  variantId: string,
  quantity: number,
): EnrollmentDraft {
  if (!Number.isInteger(quantity)) return draft;
  if (!draft.lines.some((line) => line.variantId === variantId)) return draft;
  if (quantity < MIN_LINE_QUANTITY) return removeDraftLine(draft, variantId);
  const clamped = Math.min(quantity, MAX_LINE_QUANTITY);
  return {
    ...draft,
    lines: draft.lines.map((line) =>
      line.variantId === variantId ? { ...line, quantity: clamped } : line,
    ),
  };
}

export function removeDraftLine(
  draft: EnrollmentDraft,
  variantId: string,
): EnrollmentDraft {
  return {
    ...draft,
    lines: draft.lines.filter((line) => line.variantId !== variantId),
  };
}
