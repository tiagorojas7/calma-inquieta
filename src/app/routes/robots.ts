import { servicesContext } from "~/app/context";
import { buildRobotsTxt } from "~/app/seo/robots";
import type { Route } from "./+types/coming-soon";
export function loader({ context }: Route.LoaderArgs) {
  const site = context.get(servicesContext).site;
  return new Response(
    buildRobotsTxt({ indexing: site.indexingEnabled, base: site.baseUrl }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
