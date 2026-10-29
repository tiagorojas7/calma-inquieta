/**
 * Success feedback travels as a bounded `?ok=<code>` query parameter on the
 * redirect that follows a save. Only codes the destination screen declares are
 * honored, so the page never renders text taken from the URL.
 */
export function feedbackCode<Code extends string>(
  request: Request,
  allowed: readonly Code[],
): Code | null {
  const value = new URL(request.url).searchParams.get("ok");
  return allowed.find((code) => code === value) ?? null;
}

/** `path` with the success code appended, keeping any existing query. */
export function withFeedback(path: string, code: string): string {
  const [base = "", hash] = path.split("#");
  const joined = `${base}${base.includes("?") ? "&" : "?"}ok=${encodeURIComponent(code)}`;
  return hash === undefined ? joined : `${joined}#${hash}`;
}
