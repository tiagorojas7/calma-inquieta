import { withFeedback } from "./feedback-code";

/** Names of the hidden fields a form posts (see `ReturnToFields`). */
export const RETURN_TO_FIELD = "returnTo";
export const RETURN_ANCHOR_FIELD = "anchor";

const BASE = "https://panel.invalid";
const CONTROL = /[\u0000-\u001f\u007f]/;
const ANCHOR = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

/**
 * A same-origin panel path or the fallback. Only `/admin` and what is under it
 * is kept: an absolute or protocol-relative address, a backslash, a control
 * character, a path outside the panel and any climb out of it all fall back,
 * so a posted `returnTo` can never send the owner somewhere else. The result
 * is the path and query only: a saved-message code and a hash that were
 * already there are dropped.
 */
export function safeReturnTo(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value === "") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || CONTROL.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return fallback;
  }
  const inPanel = (path: string) =>
    path === "/admin" || path.startsWith("/admin/");
  if (!inPanel(url.pathname) || !inPanel(decoded)) return fallback;
  if (decoded.split("/").includes("..")) return fallback;
  url.searchParams.delete("ok");
  return `${url.pathname}${url.search}`;
}

/** A plain element id, or null: an anchor never carries markup or a hash. */
export function safeAnchor(value: unknown): string | null {
  return typeof value === "string" && ANCHOR.test(value) ? value : null;
}

/**
 * Where to send the owner after a native post: the page the form was on, with
 * the saved-message code and the item she acted on, so she stays in place.
 * `returnTo` and `anchor` come from the form (`ReturnToFields`); a missing or
 * foreign `returnTo` goes to `fallback`. Without a `code` (a failure that
 * keeps the page) only the anchor is added.
 */
export function stayOnPage(
  form: FormData | URLSearchParams,
  options: { fallback: string; code?: string | undefined },
): string {
  const page = safeReturnTo(form.get(RETURN_TO_FIELD), options.fallback);
  const anchor = safeAnchor(form.get(RETURN_ANCHOR_FIELD));
  const withCode = options.code ? withFeedback(page, options.code) : page;
  return anchor ? `${withCode}#${anchor}` : withCode;
}
