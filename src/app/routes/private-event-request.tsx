import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { privateEventsCopy } from "~/app/private-events/copy";
import {
  EMPTY_PRIVATE_EVENT_VALUES,
  parsePrivateEventForm,
  privateEventFieldErrors,
} from "~/app/private-events/form-data";
import { buildPageMeta } from "~/app/seo/meta";
import { PrivateEventPage } from "~/app/ui/templates/private-event-page";
import { cordobaDateOf } from "~/modules/private-events";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { Route } from "./+types/private-event-request";

const PATH = "/eventos-privados";

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const profile = await services.siteContent.getBusinessProfile();
  const whatsapp = buildWhatsAppUrl(
    profile.whatsapp.display,
    profile.whatsappMessages["eventos-privados"],
  );
  return {
    sent: new URL(request.url).searchParams.get("enviado") === "1",
    minDate: cordobaDateOf(new Date()),
    whatsappHref: whatsapp.ok ? whatsapp.value : undefined,
    instagramHref: profile.instagram.url,
    site: services.site,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const { values, draft } = parsePrivateEventForm(form);
  const result = await context
    .get(servicesContext)
    .privateEvents.requestEvent(draft);
  if (result.ok) return redirect(`${PATH}?enviado=1`);
  return data(
    {
      values,
      errors: privateEventFieldErrors(result.error.issues),
    },
    { status: 422 },
  );
}

export function meta({ loaderData, error }: Route.MetaArgs) {
  if (error)
    return [
      { title: "Página no encontrada" },
      { name: "robots", content: "noindex, nofollow" },
    ];
  return buildPageMeta({
    title: privateEventsCopy.seo.title,
    description: privateEventsCopy.seo.description,
    path: PATH,
    siteName: "Calma Inquieta",
    baseUrl: loaderData.site.baseUrl,
    indexingEnabled: loaderData.site.indexingEnabled,
  });
}

export default function PrivateEventRequestRoute() {
  const loaded = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const shared = {
    copy: privateEventsCopy,
    whatsappHref: loaded.whatsappHref,
    instagramHref: loaded.instagramHref,
  };
  if (loaded.sent && !rejected)
    return <PrivateEventPage state="thanks" {...shared} />;
  return (
    <PrivateEventPage
      state="form"
      {...shared}
      minDate={loaded.minDate}
      values={rejected?.values ?? EMPTY_PRIVATE_EVENT_VALUES}
      errors={rejected?.errors ?? {}}
    />
  );
}
