import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import {
  formatEventDate,
  formatPesos,
  formatTimeRange,
} from "~/app/catalog/format";
import { intensiveRequestCopy } from "~/app/intensive-requests/copy";
import { IntensivoRequestSummaryPage } from "~/app/ui/templates/intensivo-request-summary-page";
import { buildRequestWhatsAppLink } from "~/modules/intensive-requests";
import type { Route } from "./+types/intensive-request-summary";

const copy = intensiveRequestCopy.summary;

export async function loader({ context, params }: Route.LoaderArgs) {
  const services = context.get(servicesContext);
  const found = await services.intensiveRequests.getRequestByPublicId(
    params.publicId,
  );
  if (!found.ok)
    throw data(null, {
      status: found.error.kind === "not-found" ? 404 : 503,
    });
  const request = found.value;
  const profile = await services.siteContent.getBusinessProfile();
  // Project field by field: only these values may leave the server.
  return {
    reference: request.reference,
    status: request.status,
    statusLabel: copy.status[request.status],
    intensivoName: request.intensivoName,
    date: formatEventDate(request.eventDate),
    time: formatTimeRange(request.startsAt, request.endsAt),
    deposit: formatPesos(request.deposit),
    whatsappHref:
      request.status === "pending_confirmation"
        ? buildRequestWhatsAppLink(request, profile.whatsapp.display)
        : null,
  };
}

export function headers() {
  return {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export function meta() {
  return [
    { title: "Tu solicitud" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function IntensiveRequestSummaryRoute() {
  const request = useLoaderData<typeof loader>();
  return <IntensivoRequestSummaryPage copy={copy} {...request} />;
}
