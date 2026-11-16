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
import { withFeedback } from "~/app/admin/feedback-code";
import { monthLabel } from "~/app/enrollment/order-labels";
import { AdminPageHeader } from "~/app/ui/admin/admin-page";
import {
  EnrollmentNewForm,
  enrollmentNewCopy as copy,
  type EnrollmentNewOption,
} from "~/app/ui/admin/enrollment-new-form";
import type { EnrollmentMaterialChoice } from "~/app/ui/admin/enrollment-new-materials";
import { formatPesos } from "~/modules/enrollments";
import type { AppServices } from "~/composition/request-services";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-new";

const LIST = "/admin/inscripciones";
const AFTER_CREATE = `${LIST}?estado=pending_confirmation`;

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
  return [{ title: "Nueva inscripción | Panel | Calma Inquieta" }];
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

/** Active, available catalog variants that have a price: the only ones an owner may add. */
async function loadMaterials(
  services: AppServices,
  actor: Actor,
): Promise<EnrollmentMaterialChoice[]> {
  const variants = await services.materials.listSaleVariants(actor);
  if (!variants.ok) throw enrollmentFailureResponse(variants.error);
  return variants.value.map((variant) => ({
    materialId: variant.materialId,
    variantId: variant.variantId,
    name: variant.materialName,
    label: variant.variantLabel,
    unitPrice: variant.unitPrice.toCentavos() / 100,
    priceLabel: formatPesos(variant.unitPrice),
  }));
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  return {
    options: await loadOptions(services, actor),
    materials: await loadMaterials(services, actor),
  };
}

function rejection(
  values: EnrollmentNewValues,
  errors: Partial<Record<EnrollmentNewField, string>>,
  formError: string,
  status: 409 | 422,
  lines: readonly EnrollmentNewLineValue[] = [],
) {
  return data({ values, errors, formError, lines }, { status });
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const parsed = parseEnrollmentNewForm(await request.formData());
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
    { fee: parsed.fee },
  );
  if (created.ok) return redirect(withFeedback(AFTER_CREATE, "created"));
  if (created.error.kind === "invalid-fee")
    return rejection(
      parsed.values,
      { fee: FEE_INVALID },
      copy.saveFailed,
      422,
      parsed.lines,
    );
  const materials = materialsRefusal(created.error);
  if (materials !== null)
    return rejection(
      parsed.values,
      { materials },
      copy.saveFailed,
      422,
      parsed.lines,
    );
  if (created.error.kind === "invalid") {
    const errors: Partial<Record<EnrollmentNewField, string>> = {};
    for (const issue of created.error.issues) {
      const message = ISSUE_MESSAGES[issue.field];
      if (message !== undefined && issue.field in parsed.values)
        errors[issue.field as EnrollmentNewField] ??= message;
    }
    return rejection(parsed.values, errors, copy.saveFailed, 422, parsed.lines);
  }
  const refusal = enrollmentCreateRefusal(created.error);
  if (refusal !== null)
    return rejection(parsed.values, {}, refusal, 409, parsed.lines);
  throw enrollmentFailureResponse(created.error);
}

export default function AdminEnrollmentNew() {
  const { options, materials } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: "Inscripciones", href: LIST },
          { label: copy.title },
        ]}
        back={{ href: LIST, label: copy.back }}
      />
      <EnrollmentNewForm
        values={rejected?.values ?? EMPTY}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        options={options}
        materials={materials}
        lines={rejected?.lines ?? []}
        cancelHref={LIST}
      />
    </section>
  );
}
