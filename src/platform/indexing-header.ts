/**
 * Third layer of the indexing gate (design DS9): while indexing is off, every
 * response carries `X-Robots-Tag: noindex, nofollow`, whatever route produced
 * it. The Worker applies it to the handler result, so `/status` and error
 * responses are covered too.
 */
const NOINDEX = "noindex, nofollow";

export function withIndexingHeader(
  response: Response,
  indexingEnabled: boolean,
): Response {
  if (indexingEnabled) {
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
