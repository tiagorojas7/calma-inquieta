function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** The only native action this screen accepts. */
export function parseOpenMonthIntent(form: FormData): "open-month" | null {
  return text(form, "intent") === "open-month" ? "open-month" : null;
}

/** Keep the entered month intact; the service owns calendar and range validation. */
export function parsePeriodValue(form: FormData): string {
  return text(form, "period");
}

/** The route accepts only the canonical month-key layout before service access. */
export function isExactPeriodValue(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}
