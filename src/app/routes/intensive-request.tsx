import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { formatEventDate, formatPesos } from "~/app/catalog/format";
import { requestConditions } from "~/app/intensive-requests/conditions";
import {
  intensiveRequestCopy,
  requestFailureMessages,
} from "~/app/intensive-requests/copy";
import {
  EMPTY_REQUEST_VALUES,
  parseRequestForm,
  requestFieldErrors,
} from "~/app/intensive-requests/form-data";
import { IntensivoRequestPage } from "~/app/ui/templates/intensivo-request-page";
import type { Route } from "./+types/intensive-request";

const copy = intensiveRequestCopy;

/**
 * A paused or full intensivo is still public, so the visitor goes back to its
 * page; an unknown or hidden one is the same bare 404 as the detail page.
 */
function refusal(
  kind: "not-found" | "requests-closed" | "seats-full" | "unavailable",
  slug: string,
) {
  if (kind === "not-found") return data(null, { status: 404 });
  if (kind === "unavailable") return data(null, { status: 503 });
  return redirect(`/intensivos/${slug}`);
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const found = await context
    .get(servicesContext)
    .intensiveRequests.getOffer(params.slug);
  if (!found.ok) throw refusal(found.error.kind, params.slug);
  const offer = found.value;
  return {
    intensivo: {
      name: offer.name,
      dateLine: formatEventDate(offer.eventDate),
      deposit: formatPesos(offer.deposit),
    },
    conditions: requestConditions({
      policyText: offer.policyText,
      minSeats: offer.minSeats,
    }),
    backHref: `/intensivos/${offer.slug}`,
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const { values, student } = parseRequestForm(form);
  const result = await context
    .get(servicesContext)
    .intensiveRequests.requestSeat({ slug: params.slug, student });
  if (result.ok) return redirect(`/reserva/${result.value.publicId}`);

  const error = result.error;
  switch (error.kind) {
    case "invalid":
      return data(
        {
          values,
          errors: requestFieldErrors(error.issues),
          formError: undefined,
        },
        { status: 422 },
      );
    case "duplicate-request":
      return data(
        {
          values,
          errors: {},
          formError: requestFailureMessages["duplicate-request"],
        },
        { status: 409 },
      );
    case "unavailable":
      return data(
        {
          values,
          errors: {},
          formError: requestFailureMessages.unavailable,
        },
        { status: 503 },
      );
    default:
      throw refusal(error.kind, params.slug);
  }
}

export function meta() {
  return [
    { title: copy.seo.title },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function IntensiveRequestRoute() {
  const loaded = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <IntensivoRequestPage
      copy={{ title: copy.form.label, ...copy.form }}
      intensivo={loaded.intensivo}
      conditions={loaded.conditions}
      backHref={loaded.backHref}
      values={rejected?.values ?? EMPTY_REQUEST_VALUES}
      errors={rejected?.errors ?? {}}
      formError={rejected?.formError}
    />
  );
}
