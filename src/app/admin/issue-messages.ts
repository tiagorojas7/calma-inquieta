import type { FieldIssue, IssueCode } from "~/modules/_shared";
import type {
  IntensivePublishRule,
  WorkshopPublishRule,
  WorkshopStatus,
} from "~/modules/workshops";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";

/**
 * Spanish (es-AR, voseo) admin message for each validation issue code. The
 * record type makes a new `IssueCode` a compile error until it is worded here.
 */
export const ISSUE_MESSAGES: Record<IssueCode, string> = {
  required: "Completá este campo.",
  "too-long": "Es demasiado largo. Acortalo.",
  "invalid-format": "El formato no es válido. Revisalo.",
  "out-of-range": "El valor está fuera del rango permitido.",
  "too-many-decimals": "Usá menos decimales.",
  "not-whole-pesos": "Ingresá un monto en pesos enteros.",
  duplicate: "Ya existe uno activo con el mismo nombre.",
  "not-selectable": "Esa opción no se puede elegir. Elegí otra.",
  "unknown-reference": "Lo que elegiste ya no existe. Elegí otra opción.",
  "too-many": "Hay más elementos de los permitidos. Quitá alguno.",
  "confirmation-required": "Confirmá para continuar.",
  "in-past": "La fecha tiene que ser futura.",
  "end-before-start": "El horario de fin tiene que ser posterior al de inicio.",
  "exceeds-price": "No puede superar el precio.",
  "exceeds-capacity": "No puede superar la capacidad.",
  "percentage-not-applicable": "El porcentaje no corresponde en este caso.",
};

export function issueMessage(code: IssueCode): string {
  return ISSUE_MESSAGES[code];
}

/** Field-level wording that replaces the generic text for one code. */
export type FieldMessages<F extends string> = Partial<
  Record<F, Partial<Record<IssueCode, string>>>
>;

/**
 * One message per field: the first issue reported for it wins. `overrides`
 * words a code more precisely for one field (a duplicate slug is not a
 * duplicate name).
 */
export function fieldErrors<F extends string>(
  issues: readonly FieldIssue<F>[],
  overrides: FieldMessages<F> = {},
): Partial<Record<F, string>> {
  const errors: Partial<Record<F, string>> = {};
  for (const issue of issues) {
    errors[issue.field] ??=
      overrides[issue.field]?.[issue.code] ?? issueMessage(issue.code);
  }
  return errors;
}

/** Monthly workshop fields whose generic text would mislead. */
export const INTENSIVE_FIELD_MESSAGES = {
  slug: { duplicate: "Ese enlace ya lo usa otro intensivo." },
  timeRange: {
    "invalid-format":
      "Ingresá los horarios con el formato HH:MM, por ejemplo 10:00.",
    "end-before-start":
      "El horario de fin tiene que ser posterior al de inicio.",
  },
  images: { "too-many": "Podés cargar hasta 6 imágenes." },
} as const satisfies FieldMessages<string>;

export const WORKSHOP_FIELD_MESSAGES = {
  slug: {
    duplicate: "Ese enlace ya lo usa otro taller.",
    "confirmation-required":
      "Cambiar el enlace de un taller publicado rompe su dirección actual. Marcá la confirmación para guardar.",
  },
  teacherId: {
    required: "Elegí un profesor para poder cargar el porcentaje.",
  },
} as const satisfies FieldMessages<string>;

const RULE_MESSAGES = {
  name: "un nombre",
  slug: "un enlace válido",
  teacher: "un profesor asignado",
  percentage: "el porcentaje acordado",
  "default-fee": "un arancel mensual",
  "active-turno": "al menos un turno activo",
  "draft-without-periods":
    "Solo se elimina un borrador que no tenga ningún período. Archivalo si ya no lo usás.",
} as const;

export function workshopRuleMessage(rule: keyof typeof RULE_MESSAGES): string {
  return RULE_MESSAGES[rule];
}

/** Names every unmet publish rule, never just the first. */
export function publishRulesMessage(
  rules: readonly WorkshopPublishRule[],
): string {
  return `Para publicar falta: ${rules.map(workshopRuleMessage).join(", ")}.`;
}

const INTENSIVE_RULE_MESSAGES = {
  name: "un nombre",
  slug: "un enlace válido",
  teacher: "un profesor asignado",
  percentage: "el porcentaje acordado",
  "time-range": "un horario válido",
  "future-start": "una fecha futura",
  price: "un precio",
  deposit: "una seña válida",
  capacity: "una capacidad válida",
  "min-seats": "cupos mínimos válidos",
} as const satisfies Record<IntensivePublishRule, string>;

/** Names all eligibility failures returned while a live intensivo is edited. */
export function intensivePublishRulesMessage(
  rules: readonly IntensivePublishRule[],
): string {
  return `No se puede guardar este intensivo porque falta: ${rules
    .map((rule) => INTENSIVE_RULE_MESSAGES[rule])
    .join(", ")}.`;
}

export function transitionRefusedMessage(
  from: WorkshopStatus,
  to: WorkshopStatus,
): string {
  const names = adminMicrocopy.status;
  return `No se puede pasar de ${names[from]} a ${names[to]}.`;
}

/** Turno fields whose generic text would mislead. */
export const TURNO_FIELD_MESSAGES = {
  label: { duplicate: "Ya hay un turno con ese nombre en este taller." },
  weekday: {
    "invalid-format": "Elegí un día de la semana.",
    "out-of-range": "Elegí un día de la semana.",
  },
  timeRange: {
    "invalid-format":
      "Ingresá los horarios con el formato HH:MM, por ejemplo 10:00.",
  },
  defaultCapacity: {
    "invalid-format": "Ingresá un número entero de 1 a 500.",
    "out-of-range": "Ingresá un número entero de 1 a 500.",
  },
} as const satisfies FieldMessages<string>;

const TURNO_RULE_MESSAGES = {
  "last-active-turno-of-published":
    "Es el único turno activo de un taller publicado. Pausá el taller primero.",
  "turno-used":
    "Algún mes ya usó este turno, así que no se puede eliminar. Retiralo para que no se ofrezca más.",
} as const;

export function turnoRulesMessage(
  rules: readonly (keyof typeof TURNO_RULE_MESSAGES)[],
): string {
  return rules.map((rule) => TURNO_RULE_MESSAGES[rule]).join(" ");
}
