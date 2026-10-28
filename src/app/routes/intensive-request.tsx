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

/** An unknown or hidden intensivo is the same bare 404 as the detail page. */
function gone(kind: "not-found" | "unavailable") {
  return data(null, { status: kind === "not-found" ? 404 : 503 });
}

/** A paused or full intensivo is still public, so the visitor goes back to it. */
const backToDetail = (slug: string) => redirect(`/intensivos/${slug}`);

export async function loader({ context, params }: Route.LoaderArgs) {
  const found = await context
    .get(servicesContext)
    .intensiveRequests.getOffer(params.slug);
  if (!found.ok) {
    const kind = found.error.kind;
    if (kind === "requests-closed" || kind === "seats-full")
      return backToDetail(params.slug);
    throw gone(kind);
  }
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
    case "requests-closed":
    case "seats-full":
      return backToDetail(params.slug);
    default:
      throw gone(error.kind);
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
