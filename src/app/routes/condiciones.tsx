import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { loadPolicyPage } from "~/app/enrollment/policy-document";
import { buildPageMeta } from "~/app/seo/meta";
import { PolicyPage } from "~/app/ui/templates/policy-page";
import type { Route } from "./+types/condiciones";

export async function loader({ context }: Route.LoaderArgs) {
  const page = await loadPolicyPage(context.get(servicesContext), "conditions");
  if (page === null) throw data(null, { status: 503 });
  return page;
}

export function meta({ loaderData, error }: Route.MetaArgs) {
  if (error)
    return [
      { title: "Página no encontrada" },
      { name: "robots", content: "noindex, nofollow" },
    ];
  return buildPageMeta(loaderData.metaInput);
}

export default function CondicionesRoute() {
  const { title, versionLine, paragraphs } = useLoaderData<typeof loader>();
  return (
    <PolicyPage
      title={title}
      versionLine={versionLine}
      paragraphs={paragraphs}
    />
  );
}
