import type { FieldIssue, IssueCode } from "~/modules/_shared";

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

/** One message per field: the first issue reported for it wins. */
export function fieldErrors<F extends string>(
  issues: readonly FieldIssue<F>[],
): Partial<Record<F, string>> {
  const errors: Partial<Record<F, string>> = {};
  for (const issue of issues) {
    errors[issue.field] ??= issueMessage(issue.code);
  }
  return errors;
}
