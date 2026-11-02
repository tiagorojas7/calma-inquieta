import { data, redirect } from "react-router";
import { servicesContext } from "~/app/context";
import type { EnrollmentStudentDraft } from "~/app/enrollment/enrollment-draft";
import type { AppServices } from "~/composition/request-services";
import { buildCart, type RequestEnrollmentError } from "~/modules/enrollments";

type ActionArgs = {
  request: Request;
  params: { slug?: string };
  context: { get(key: typeof servicesContext): AppServices };
};

function requestedPeriod(request: Request): string {
  try {
    return new URL(request.url).searchParams.get("period") ?? "";
  } catch {
    return "";
  }
}

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseStudent(value: unknown): EnrollmentStudentDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const student = value as Record<string, unknown>;
  if (
    typeof student.fullName !== "string" ||
    typeof student.email !== "string" ||
    typeof student.phone !== "string" ||
    typeof student.turnoId !== "string" ||
    typeof student.period !== "string" ||
    student.policyAccepted !== true
  )
    return null;
  return {
    fullName: student.fullName,
    email: student.email,
    phone: student.phone,
    turnoId: student.turnoId,
    period: student.period,
    policyAccepted: true,
  };
}

const VARIANT_FIELD = "variant-";
const QUANTITY_FIELD = "quantity-";

/**
 * The native fields of the selector: one radio `variant-<materialId>` and one
 * number `quantity-<materialId>` per product. They only add a line for a
 * material the draft `lines` do not already cover, so a hydrated page (whose
 * fields mirror the draft) never counts a product twice. Prices are never
 * read from the form: the use case refuses what cannot be ordered.
 */
function nativePicks(
  form: FormData,
  covered: ReadonlySet<string>,
): unknown[] | null {
  const picks: unknown[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith(VARIANT_FIELD) || typeof value !== "string") continue;
    const materialId = key.slice(VARIANT_FIELD.length);
    if (covered.has(materialId) || value === "") continue;
    const raw = form.get(QUANTITY_FIELD + materialId);
    const quantity = raw === null ? 1 : Number(raw);
    if (typeof raw === "string" && raw.trim() === "") return null;
    if (!Number.isFinite(quantity)) return null;
    picks.push({ materialId, variantId: value, quantity });
  }
  return picks;
}

function withNativePicks(form: FormData, parsed: unknown): unknown {
  if (!Array.isArray(parsed)) return parsed;
  const covered = new Set<string>();
  for (const entry of parsed as unknown[]) {
    if (typeof entry === "object" && entry !== null) {
      const { materialId } = entry as { materialId?: unknown };
      if (typeof materialId === "string") covered.add(materialId);
    }
  }
  const picks = nativePicks(form, covered);
  return picks === null ? null : [...(parsed as unknown[]), ...picks];
}

function parseLines(value: unknown) {
  if (!Array.isArray(value)) return null;
  const lines = value.map((entry) => {
    if (typeof entry !== "object" || entry === null) return null;
    const line = entry as Record<string, unknown>;
    if (
      typeof line.materialId !== "string" ||
      typeof line.variantId !== "string" ||
      typeof line.quantity !== "number"
    )
      return null;
    return {
      materialId: line.materialId,
      variantId: line.variantId,
      quantity: line.quantity,
    };
  });
  if (lines.some((line) => line === null)) return null;
  return buildCart(lines as Exclude<(typeof lines)[number], null>[]);
}

function actionMessage(error: RequestEnrollmentError): string {
  switch (error.kind) {
    case "materials-required":
      return "Elegí al menos un material.";
    case "material-not-offered":
    case "material-unavailable":
      return "Uno de los materiales ya no está disponible.";
    case "invalid-quantity":
    case "too-many-lines":
      return "Revisá las cantidades seleccionadas.";
    case "turno-full":
    case "turno-not-offered":
      return "Ese turno ya no está disponible. Volvé a elegirlo.";
    case "duplicate-order":
      return "Ya tenés una inscripción activa para este taller.";
    case "invalid":
      return "Revisá tus datos antes de continuar.";
    case "not-found":
    case "period-closed":
    case "enrollments-paused":
      return "La inscripción cambió. Volvé al taller para empezar de nuevo.";
    case "invalid-price":
    case "invalid-fee":
    case "invalid-total":
    case "unavailable":
      return "Actualizá la página y probá de nuevo.";
  }
}

export async function action({ context, params, request }: ActionArgs) {
  const form = await request.formData();
  const student = parseStudent(parseJson(form.get("student")));
  const cart = parseLines(withNativePicks(form, parseJson(form.get("lines"))));
  if (
    student === null ||
    student.period !== requestedPeriod(request) ||
    cart === null ||
    !cart.ok
  ) {
    return data(
      { formError: "Revisá los datos de tu inscripción." },
      { status: 422 },
    );
  }
  const result = await context
    .get(servicesContext)
    .publicEnrollments.requestEnrollment({
      slug: params.slug ?? "",
      period: student.period,
      turnoId: student.turnoId,
      student: { ...student, honeypot: "" },
      lines: cart.value,
    });
  if (result.ok) return redirect(`/pedido/${result.value.publicId}`);
  return data({ formError: actionMessage(result.error) }, { status: 422 });
}
