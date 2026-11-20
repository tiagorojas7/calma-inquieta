import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { dateTimeLabel } from "~/app/enrollment/order-labels";
import { isUuid } from "~/app/admin/enrollment-ids";
import {
  parseCancelRefund,
  refundFieldError,
} from "~/app/admin/enrollment-cancel-form-data";
import {
  enrollmentFieldErrors,
  enrollmentRefusalMessage,
  parseEnrollmentIntent,
} from "~/app/admin/enrollment-action-data";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import {
  MATERIAL_UNAVAILABLE,
  materialsRefusal,
  parseMaterialLines,
} from "~/app/admin/enrollment-new-form-data";
import { feedbackCode } from "~/app/admin/feedback-code";
import { formatPhone, telHref } from "~/app/admin/phone-format";
import { stayOnPage } from "~/app/admin/return-to";
import { whatsappHref } from "~/app/admin/whatsapp-href";
import { recordCard, saleCard } from "~/app/admin/student-file";
import { amountOwed } from "~/app/admin/student-debt";
import { formatPesos } from "~/modules/enrollments";
import { adminCopy } from "~/app/ui/admin/copy";
import { StudentDetail } from "~/app/ui/admin/student-detail";
import { normalizeStudentEmail } from "~/modules/students";
import { loadMaterialChoices } from "./enrollment-material-choices";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/student-detail";

export function meta() {
  return [{ title: "Alumna | Panel | Calma Inquieta" }];
}

const CORDOBA_OFFSET_MS = 10_800_000;
const copy = adminCopy.alumnas;
const FEEDBACK = [
  "paid",
  "sold",
  "cancelled",
  "created",
  "note-saved",
  "deactivated",
  "reactivated",
] as const;
const ACTIVITY_INTENTS = { deactivate: false, reactivate: true } as const;
const NO_MATERIALS = "Elegí al menos un material.";
const NOT_SELLABLE = "Esta inscripción está cancelada: ya no admite ventas.";

/** The email in the path, or a 404 for anything that cannot be one. */
function emailParam(value: string | undefined): string {
  const email = normalizeStudentEmail(value ?? "");
  if (!email.includes("@")) throw data(null, { status: 404 });
  return email;
}

const filePath = (email: string) =>
  `/admin/alumnas/${encodeURIComponent(email)}`;

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const email = emailParam(params.email);
  const services = context.get(servicesContext);
  const [found, summary, seatPayments] = await Promise.all([
    services.students.detail(actor, email),
    services.attendance.studentSummary(actor, email),
    services.intensiveRequests.owedPayments(actor, email),
  ]);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  // Never "Al día" on a guess: without the workshop payments the file fails.
  if (!seatPayments.ok) throw enrollmentFailureResponse(seatPayments.error);
  const student = found.value;
  const seatDebts = seatPayments.value;
  const owed = amountOwed(student.orders, seatDebts);
  const detailOf = async (id: string) => {
    const result = await services.enrollments.detail(actor, id);
    if (!result.ok) throw enrollmentFailureResponse(result.error);
    return result.value;
  };
  // A material sale is never a record of its own: it is read through the
  // monthly record it belongs to and shown nested in that record's card.
  const records = await Promise.all(
    student.orders
      .filter((order) => order.kind !== "material_sale")
      .map(async (order) => {
        const record = await detailOf(order.id);
        const sales = await Promise.all(
          (record.sales ?? []).map((sale) => detailOf(sale.id)),
        );
        return recordCard(record, sales.map(saleCard));
      }),
  );
  const code = feedbackCode(request, FEEDBACK);
  return {
    saved: code === null ? null : copy.saved[code](student.fullName),
    name: student.fullName,
    email: student.email,
    phone: student.phoneDigits,
    phoneShown: formatPhone(student.phoneDigits),
    phoneLink: telHref(student.phoneDigits) ?? null,
    whatsappLink: whatsappHref(student.phoneDigits) ?? null,
    // Everything she owes in one line: the fee, the sales and the workshops.
    owes: owed.isZero() ? null : formatPesos(owed),
    seatDebts: seatDebts.map((debt) => ({
      label: copy.file.seatDebt[debt.kind](debt.workshopName ?? ""),
      amount: formatPesos(debt.amount),
    })),
    active: student.active,
    path: filePath(student.email),
    today: new Date(Date.now() - CORDOBA_OFFSET_MS).toISOString().slice(0, 10),
    enrollHref: `/admin/inscripciones/nueva?${new URLSearchParams({
      nombre: student.fullName,
      email: student.email,
      telefono: student.phoneDigits,
    }).toString()}`,
    records,
    materials: records.some((record) => record.canSell)
      ? await loadMaterialChoices(services, actor)
      : [],
    // Attendance is optional here: the student file still opens without it.
    attendance: summary.ok
      ? copy.file.attendance(
          String(summary.value.present),
          String(summary.value.absent),
          String(summary.value.makeUpsPending),
        )
      : null,
    note: {
      text: student.note?.text ?? "",
      meta: student.note
        ? `Actualizadas por ${student.note.updatedBy} el ${dateTimeLabel(student.note.updatedAt)}.`
        : null,
    },
  };
}

type Refused = {
  orderId?: string;
  intent: "confirm" | "sale" | "cancel" | "note";
  message: string;
  lines?: readonly {
    materialId: string;
    variantId: string;
    quantity: string;
  }[];
  paid?: boolean;
  noteValue?: string;
};

const refused = (status: 409 | 422, body: Refused) => data(body, { status });

const joined = (messages: Partial<Record<string, string>>) =>
  Object.values(messages).join(" ");

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const email = emailParam(params.email);
  const services = context.get(servicesContext);
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const back = (code: (typeof FEEDBACK)[number]) =>
    redirect(stayOnPage(form, { fallback: filePath(email), code }));
  const intent = form.get("intent");

  if (intent === null || intent === "note") {
    const note = form.get("note");
    if (typeof note !== "string") throw data(null, { status: 400 });
    const saved = await services.students.saveNote(actor, email, note);
    if (saved.ok) return back("note-saved");
    if (saved.error.kind === "invalid")
      return refused(422, {
        intent: "note",
        message: copy.file.noteTooLong,
        noteValue: note,
      });
    throw enrollmentFailureResponse(saved.error);
  }
  if (typeof intent !== "string") throw data(null, { status: 400 });

  if (intent in ACTIVITY_INTENTS) {
    const active = ACTIVITY_INTENTS[intent as keyof typeof ACTIVITY_INTENTS];
    const changed = await services.students.setActive(actor, email, active);
    if (!changed.ok) throw enrollmentFailureResponse(changed.error);
    return back(active ? "reactivated" : "deactivated");
  }

  // Everything else acts on one order of this student's file.
  if (intent !== "confirm" && intent !== "sale" && intent !== "cancel")
    throw data(null, { status: 400 });
  const posted = form.get("orderId");
  const orderId = typeof posted === "string" ? posted : "";
  if (!isUuid(orderId)) throw data(null, { status: 400 });
  const found = await services.students.detail(actor, email);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  if (!found.value.orders.some((order) => order.id === orderId))
    throw data(null, { status: 404 });
  const enrollments = services.enrollments;

  if (intent === "sale") {
    const chosen = parseMaterialLines(form);
    const paid = form.get("paid") === "on";
    const again = { orderId, intent, lines: chosen.lines, paid } as const;
    if (chosen.malformed)
      return refused(422, { ...again, message: MATERIAL_UNAVAILABLE });
    if (chosen.cartLines.length === 0)
      return refused(422, { ...again, message: NO_MATERIALS });
    const created = await enrollments.createMaterialSale(actor, {
      orderId,
      lines: chosen.cartLines,
      paid,
    });
    if (created.ok) return back("sold");
    if (created.error.kind === "not-sellable")
      return refused(409, { ...again, message: NOT_SELLABLE });
    if (created.error.kind === "empty-sale")
      return refused(422, { ...again, message: NO_MATERIALS });
    const materials = materialsRefusal(created.error);
    if (materials !== null)
      return refused(422, { ...again, message: materials });
    throw enrollmentFailureResponse(created.error);
  }

  const parsed = parseEnrollmentIntent(form);
  if (
    parsed === null ||
    (parsed.kind !== "confirm" && parsed.kind !== "cancel")
  )
    throw data(null, { status: 400 });
  const refund = parseCancelRefund(form);
  const result =
    parsed.kind === "confirm"
      ? await enrollments.confirmPayment(actor, {
          orderId,
          amount: parsed.amount,
          paidOn: parsed.paidOn,
          ...(parsed.note === "" ? {} : { note: parsed.note }),
        })
      : await enrollments.cancel(actor, {
          orderId,
          reason: parsed.reason,
          ...(refund === undefined ? {} : { refund }),
        });
  if (!result.ok) {
    if (result.error.kind === "invalid")
      return refused(422, {
        orderId,
        intent,
        message: joined(enrollmentFieldErrors(result.error.issues)),
      });
    if (result.error.kind === "invalid-refund")
      return refused(422, {
        orderId,
        intent,
        message: joined(refundFieldError(result.error)),
      });
    const message = enrollmentRefusalMessage(result.error);
    if (message !== null) return refused(409, { orderId, intent, message });
    throw enrollmentFailureResponse(result.error);
  }
  const outcome = enrollmentRefusalMessage({ kind: result.value.kind });
  return outcome === null
    ? back(parsed.kind === "confirm" ? "paid" : "cancelled")
    : refused(409, { orderId, intent, message: outcome });
}

export default function AdminStudentDetail() {
  const { saved, ...student } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <StudentDetail
      student={student}
      path={student.path}
      today={student.today}
      enrollHref={student.enrollHref}
      materials={student.materials}
      saved={saved}
      {...(result ? { form: result } : {})}
    />
  );
}
