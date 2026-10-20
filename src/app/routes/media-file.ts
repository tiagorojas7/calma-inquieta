import { servicesContext } from "~/app/context";
import { immutableImageHeaders } from "~/modules/media";
import type { Route } from "./+types/media-file";

/** Empty body, never cached: it reveals neither a key nor a bucket name. */
function notFound(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Public image serving (media-storage "Serving"). It sits outside `/admin`, so
 * no admin identity is read. A malformed name, an unknown id, a missing object
 * and an unavailable store all answer the same bare 404.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  const result = await context.get(servicesContext).media.serve(params.file);
  if (!result.ok) return notFound();
  const image = result.value;
  return new Response(image.body, {
    status: 200,
    headers: {
      ...immutableImageHeaders(image.contentType),
      "Content-Length": String(image.byteSize),
      ETag: image.etag,
    },
  });
}
