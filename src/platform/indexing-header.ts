/**
 * Third layer of the indexing gate (design DS9): while indexing is off, every
 * response the request handler returns carries `X-Robots-Tag: noindex,
 * nofollow`, whatever route produced it. That includes `/status` and the error
 * responses React Router renders itself (a 404 or a 500 from an error boundary).
 *
 * Known limitation: a response the runtime generates after the handler throws
 * never reaches this function, so it carries no header. While the gate is off,
 * `robots.txt` (`Disallow: /`) and the `noindex` meta still cover those pages.
 */
const NOINDEX = "noindex, nofollow";

/** The status of a WebSocket upgrade; `new Response` rejects it. */
const SWITCHING_PROTOCOLS = 101;

export function withIndexingHeader(
  response: Response,
  indexingEnabled: boolean,
): Response {
  if (indexingEnabled || response.status === SWITCHING_PROTOCOLS) {
    return response;
  }
  // A fresh Response: the headers of a handler result may be immutable.
  const headers = new Headers(response.headers);
  // `set`, not `append`: a route that already sent the header ends with the gate's value only.
  headers.set("X-Robots-Tag", NOINDEX);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * The Worker's own answer when its environment is invalid. An invalid
 * environment means the gate cannot be read, so it is treated as off: the body
 * stays generic and the response is never indexable.
 */
export function unavailableResponse(): Response {
  return withIndexingHeader(
    new Response("Service unavailable", { status: 500 }),
    false,
  );
}
