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
  const cart = parseLines(parseJson(form.get("lines")));
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
