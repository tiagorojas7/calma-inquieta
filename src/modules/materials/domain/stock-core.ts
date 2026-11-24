import type { FieldIssue, Result } from "~/modules/_shared";

export type StockAdjustmentField = "delta" | "reason";

/** Raw form text: a signed whole number and a short reason. */
export interface StockAdjustmentDraft {
  readonly delta: string;
  readonly reason: string;
}

export interface ValidStockAdjustment {
  /** Non-zero; positive adds units, negative removes them. */
  readonly delta: number;
  readonly reason: string;
}

export const STOCK_REASON_MAX = 200;
/** One adjustment moves at most this many units; guards typos like 1000000. */
export const STOCK_DELTA_MAX = 100_000;

export function validateStockAdjustment(
  draft: StockAdjustmentDraft,
): Result<ValidStockAdjustment, readonly FieldIssue<StockAdjustmentField>[]> {
  const issues: FieldIssue<StockAdjustmentField>[] = [];
  const reason = draft.reason.trim().normalize("NFC");
  const text = draft.delta.trim();

  let delta = 0;
  if (text === "") issues.push({ field: "delta", code: "required" });
  else if (!/^[+-]?\d+$/.test(text))
    issues.push({ field: "delta", code: "invalid-format" });
  else {
    delta = Number(text);
    if (delta === 0 || Math.abs(delta) > STOCK_DELTA_MAX) {
      issues.push({ field: "delta", code: "out-of-range" });
    }
  }

  if (reason === "") issues.push({ field: "reason", code: "required" });
  else if (reason.length > STOCK_REASON_MAX)
    issues.push({ field: "reason", code: "too-long" });

  if (issues.length > 0) return { ok: false, error: issues };
  return { ok: true, value: { delta, reason } };
}
