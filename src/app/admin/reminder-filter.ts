import { REMINDER_KINDS, REMINDER_STATUSES } from "~/modules/reminders";
import type { ReminderRequest } from "~/modules/reminders";
import { isUuid } from "./enrollment-ids";

const TEXT_MAX = 1000;
const TURNO_MAX = 60;
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface ReminderFormValues {
  readonly mensaje: string;
  readonly cuando: string;
  readonly actividad: string;
  readonly texto: string;
  readonly taller: string;
  readonly mes: string;
  readonly turno: string;
  readonly estado: string;
}

/**
 * The reminders page reads its GET parameters (`mensaje`, `cuando`,
 * `actividad`, `texto`, `taller`, `mes`, `turno`, `estado`). Nothing is
 * prepared until a valid `mensaje` is present; unknown audience filters are
 * dropped so they widen the audience instead of failing the page.
 */
export function parseReminderRequest(params: URLSearchParams): {
  request: ReminderRequest | null;
  values: ReminderFormValues;
} {
  const text = (name: string, max: number) =>
    (params.get(name) ?? "").trim().slice(0, max);
  const kind = REMINDER_KINDS.find((k) => k === params.get("mensaje"));
  const tallerParam = text("taller", 100);
  const taller = isUuid(tallerParam) ? tallerParam : "";
  const mesParam = text("mes", 7);
  const mes = PERIOD.test(mesParam) ? mesParam : "";
  const turno = text("turno", TURNO_MAX);
  const status = REMINDER_STATUSES.find((s) => s === params.get("estado"));
  const cuando = text("cuando", TEXT_MAX);
  const actividad = text("actividad", TEXT_MAX);
  const texto = text("texto", TEXT_MAX);

  const values: ReminderFormValues = {
    mensaje: kind ?? "class",
    cuando,
    actividad,
    texto,
    taller,
    mes,
    turno,
    estado: status ?? "",
  };
  if (kind === undefined) return { request: null, values };
  return {
    request: {
      kind,
      inputs: { when: cuando, activity: actividad, text: texto },
      filter: {
        ...(taller === "" ? {} : { workshopId: taller }),
        ...(mes === "" ? {} : { period: mes }),
        ...(turno === "" ? {} : { turnoLabel: turno }),
        ...(status === undefined ? {} : { status }),
      },
    },
    values,
  };
}
