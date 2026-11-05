import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router";
import { servicesContext } from "~/app/context";
import { saveEnrollmentDraft } from "~/app/enrollment/enrollment-draft";
import { monthLabel } from "~/app/enrollment/order-labels";
import { EnrollmentPage } from "~/app/ui/templates/enrollment-page";
import type { AppServices } from "~/composition/request-services";
import type { RequestEnrollmentError } from "~/modules/enrollments";

type RouteArgs = {
  request: Request;
  params: { slug?: string };
  context: { get(key: typeof servicesContext): AppServices };
};

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  turnoId: string;
};

type FieldErrors = Partial<
  Record<"fullName" | "email" | "phone" | "policy", string>
>;

type ActionFailure = {
  values: FormValues;
  errors: FieldErrors;
  formError?: string;
  needsMaterials?: true;
};

const EMPTY_VALUES: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  turnoId: "",
};

function formatPesos(centavos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

function requestedPeriod(request: Request): string {
  try {
    return new URL(request.url).searchParams.get("period") ?? "";
  } catch {
    return "";
  }
}

function valuesFrom(form: FormData): FormValues {
  const value = (name: string) => {
    const entry = form.get(name);
    return typeof entry === "string" ? entry : "";
  };
  return {
    fullName: value("fullName"),
    email: value("email"),
    phone: value("phone"),
    turnoId: value("turnoId"),
  };
}

function studentErrors(error: RequestEnrollmentError): FieldErrors | null {
  if (error.kind !== "invalid") return null;
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.field,
      issue.field === "fullName"
        ? "Ingresá tu nombre completo."
        : issue.field === "email"
          ? "Ingresá un email válido."
          : issue.field === "phone"
            ? "Ingresá un teléfono argentino válido."
            : "Tenés que aceptar la política de privacidad.",
    ]),
  );
}

function formError(error: RequestEnrollmentError): string {
  switch (error.kind) {
    case "not-found":
    case "period-closed":
    case "unavailable":
      return "Esta inscripción no está disponible.";
    case "enrollments-paused":
      return "Las inscripciones están pausadas.";
    case "turno-not-offered":
      return "Elegí un turno disponible.";
    case "turno-full":
      return "Ese turno ya no tiene lugares disponibles.";
    case "duplicate-order":
      return "Ya registraste una inscripción activa para este taller.";
    case "materials-required":
      return "Elegí los materiales para continuar.";
    default:
      return "No pudimos registrar tu inscripción. Probá de nuevo.";
  }
}

/** Exposes only the public offer projection needed by the enrollment page. */
export async function loader({ context, params, request }: RouteArgs) {
  const period = requestedPeriod(request);
  const result = await context
    .get(servicesContext)
    .publicEnrollments.getOffer({ slug: params.slug ?? "", period });
  if (!result.ok) {
    if (result.error.kind === "enrollments-paused")
      return { paused: true as const };
    throw data(null, { status: 404 });
  }
  const offer = result.value;
  return {
    offer: {
      workshopName: offer.workshopName,
      period: offer.period,
      periodLabel: monthLabel(offer.period),
      fee: formatPesos(offer.fee.toCentavos()),
      materialsRequired: offer.materialsRequired,
      turnos: offer.turnos.map((turno) => ({
        id: turno.id,
        label: turno.label,
        weekday: turno.weekday,
        startsAt: turno.startsAt,
        endsAt: turno.endsAt,
      })),
    },
  };
}

function textField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function action({ request, context, params }: RouteArgs) {
  const form = await request.formData();
  const values = valuesFrom(form);
  const result = await context
    .get(servicesContext)
    .publicEnrollments.requestEnrollment({
      slug: params.slug ?? "",
      period: textField(form, "period"),
      turnoId: values.turnoId,
      student: {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        policyAccepted: form.get("policy") === "on",
        honeypot: textField(form, "honeypot"),
      },
      lines: [],
    });
  if (result.ok) return redirect(`/pedido/${result.value.publicId}`);

  const errors = studentErrors(result.error);
  if (errors) return { values, errors } satisfies ActionFailure;
  if (result.error.kind === "materials-required") {
    return { values, errors: {}, needsMaterials: true } satisfies ActionFailure;
  }
  return {
    values,
    errors: {},
    formError: formError(result.error),
  } satisfies ActionFailure;
}

export default function EnrollmentRoute() {
  const loaded = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const offer = loaded.offer;
  if (offer === undefined) return <EnrollmentPage state="paused" />;
  const period = offer.period;

  function continueToMaterials() {
    if (!rejected?.needsMaterials) return;
    saveEnrollmentDraft(window.sessionStorage, slug, {
      student: {
        ...rejected.values,
        period,
        policyAccepted: true,
      },
      lines: [],
    });
    void navigate(
      `/talleres/${slug}/inscripcion/materiales?period=${encodeURIComponent(period)}`,
    );
  }

  return (
    <EnrollmentPage
      state="open"
      offer={offer}
      values={rejected?.values ?? EMPTY_VALUES}
      errors={rejected?.errors ?? {}}
      backHref={`/talleres/${slug}`}
      {...(rejected?.formError ? { formError: rejected.formError } : {})}
      {...(rejected?.needsMaterials
        ? { needsMaterials: true, onContinueToMaterials: continueToMaterials }
        : {})}
    />
  );
}
