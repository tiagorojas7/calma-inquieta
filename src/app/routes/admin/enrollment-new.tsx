import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import {
  FEE_INVALID,
  materialsRefusal,
  parseEnrollmentNewForm,
  type EnrollmentNewField,
  type EnrollmentNewLineValue,
  type EnrollmentNewValues,
  encodeOffer,
} from "~/app/admin/enrollment-new-form-data";
import {
  enrollmentCreateRefusal,
  enrollmentFailureResponse,
} from "~/app/admin/enrollment-failure";
import { loadMaterialChoices } from "./enrollment-material-choices";
import { withFeedback } from "~/app/admin/feedback-code";
import { recordAnchor } from "~/app/admin/student-file";
import { monthLabel } from "~/app/enrollment/order-labels";
import { AdminPageHeader } from "~/app/ui/admin/admin-page";
import { adminCopy } from "~/app/ui/admin/copy";
import {
  EnrollmentNewForm,
  type EnrollmentNewOption,
} from "~/app/ui/admin/enrollment-new-form";
import type { AppServices } from "~/composition/request-services";
import { normalizeStudentEmail } from "~/modules/students";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-new";

const copy = adminCopy.alumnas.enroll;
const BACK = "/admin/alumnas";
const PREFILL_MAX = 120;

const EMPTY: EnrollmentNewValues = {
  offer: "",
  fullName: "",
  email: "",
  phone: "",
  fee: "",
};

const ISSUE_MESSAGES: Record<string, string> = {
  fullName: "Ingresá el nombre completo.",
  email: "Ingresá un email válido.",
  phone: "Ingresá un teléfono argentino válido.",
};

export function meta() {
  return [{ title: "Inscribir alumna | Panel | Calma Inquieta" }];
}

type Actor = Parameters<AppServices["monthlyWorkshops"]["list"]>[0];

/** Every live workshop x open month x turno that still takes enrollments. */
async function loadOptions(services: AppServices, actor: Actor) {
  const workshops = await services.monthlyWorkshops.list(actor, {
    status: "live",
  });
  if (!workshops.ok) throw enrollmentFailureResponse(workshops.error);
  const options: EnrollmentNewOption[] = [];
  for (const summary of workshops.value) {
    if (!summary.acceptsNewRequests) continue;
    const [workshop, periods] = await Promise.all([
      services.monthlyWorkshops.get(actor, summary.id),
      services.workshopPeriods.list(actor, summary.id),
    ]);
    if (!workshop.ok || !periods.ok) continue;
    for (const period of periods.value.periods) {
      if (period.status !== "open" || period.activeTurnos === 0) continue;
      const offer = await services.publicEnrollments.getOffer({
        slug: workshop.value.slug,
        period: period.period,
      });
      if (!offer.ok) continue;
      for (const turno of offer.value.turnos)
        options.push({
          value: encodeOffer({
            slug: workshop.value.slug,
            period: period.period,
            turnoId: turno.id,
          }),
          label: `${summary.name} · ${monthLabel(period.period)} · ${turno.label}`,
          fee: String(offer.value.fee.toCentavos() / 100),
        });
    }
  }
  return options;
}

/** One value her file sends along, trimmed and bounded; nothing else in the address is read. */
const queryValue = (params: URLSearchParams, name: string) =>
  (params.get(name) ?? "").trim().slice(0, PREFILL_MAX);

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const params = new URL(request.url).searchParams;
  return {
    // Coming from her file, her data is already in the form.
    prefill: {
      fullName: queryValue(params, "nombre"),
      email: queryValue(params, "email"),
      phone: queryValue(params, "telefono"),
    },
    options: await loadOptions(services, actor),
    materials: await loadMaterialChoices(services, actor),
  };
}

function rejection(
  values: EnrollmentNewValues,
  errors: Partial<Record<EnrollmentNewField, string>>,
  formError: string,
  status: 409 | 422,
  lines: readonly EnrollmentNewLineValue[] = [],
  paid = false,
) {
  return data({ values, errors, formError, lines, paid }, { status });
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const parsed = parseEnrollmentNewForm(form);
  // "Ya pagó": the owner took the full payment, so the record is stored paid.
  const paid = form.get("paid") === "on";
  if (
    parsed.target === null ||
    parsed.fee === null ||
    Object.keys(parsed.errors).length > 0
  )
    return rejection(
      parsed.values,
      parsed.errors,
      copy.saveFailed,
      422,
      parsed.lines,
      paid,
    );
  const { fullName, email, phone } = parsed.values;
  const created = await context.get(servicesContext).enrollments.createPending(
    actor,
    {
      ...parsed.target,
      student: {
        fullName,
        email,
        phone,
        policyAccepted: true,
        honeypot: "",
      },
      lines: parsed.cartLines,
    },
    paid ? { fee: parsed.fee, paid } : { fee: parsed.fee },
  );
  // The one allowed jump: it lands on her file, at the record just created.
  if (created.ok)
    return redirect(
      `${withFeedback(
        `/admin/alumnas/${encodeURIComponent(normalizeStudentEmail(email))}`,
        "created",
      )}#${recordAnchor(created.value.number)}`,
    );
  if (created.error.kind === "invalid-fee")
    return rejection(
      parsed.values,
      { fee: FEE_INVALID },
      copy.saveFailed,
      422,
      parsed.lines,
      paid,
    );
  const materials = materialsRefusal(created.error);
  if (materials !== null)
    return rejection(
      parsed.values,
      { materials },
      copy.saveFailed,
      422,
      parsed.lines,
      paid,
    );
  if (created.error.kind === "invalid") {
    const errors: Partial<Record<EnrollmentNewField, string>> = {};
    for (const issue of created.error.issues) {
      const message = ISSUE_MESSAGES[issue.field];
      if (message !== undefined && issue.field in parsed.values)
        errors[issue.field as EnrollmentNewField] ??= message;
    }
    return rejection(
      parsed.values,
      errors,
      copy.saveFailed,
      422,
      parsed.lines,
      paid,
    );
  }
  const refusal = enrollmentCreateRefusal(created.error);
  if (refusal !== null)
    return rejection(parsed.values, {}, refusal, 409, parsed.lines, paid);
  throw enrollmentFailureResponse(created.error);
}

export default function AdminEnrollmentNew() {
  const { options, materials, prefill } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        back={{ href: BACK, label: copy.back }}
      />
      <EnrollmentNewForm
        values={rejected?.values ?? { ...EMPTY, ...prefill }}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        options={options}
        materials={materials}
        lines={rejected?.lines ?? []}
        paid={rejected?.paid ?? false}
        cancelHref={BACK}
      />
    </section>
  );
}
