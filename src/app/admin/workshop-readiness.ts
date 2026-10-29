const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Spanish month name of a `YYYY-MM` period key. */
export function monthName(period: string): string {
  const index = Number(period.slice(5, 7)) - 1;
  return MONTHS[index] ?? period;
}

export type ReadinessStepKey =
  "shift" | "publish" | "month" | "seats" | "materials" | "open";

export interface ReadinessInput {
  readonly workshopId: string;
  readonly status: string;
  readonly activeTurnos: number;
  /** Current Córdoba month, `YYYY-MM`. */
  readonly month: string;
  /** The workshop's period for `month`, when one exists. */
  readonly period: {
    readonly status: "draft" | "open" | "closed";
    readonly totalCapacity: number;
    readonly materialsRequired: boolean;
    /** `null` when the caller does not know (list views). */
    readonly materialsCount: number | null;
  } | null;
}

export interface ReadinessStep {
  readonly key: ReadinessStepKey;
  readonly label: string;
  readonly done: boolean;
  readonly cta: string;
  readonly href: string;
}

export interface Readiness {
  readonly steps: readonly ReadinessStep[];
  readonly next: ReadinessStep | null;
  readonly complete: boolean;
  readonly summary: string;
  readonly monthName: string;
}

const SUMMARIES: Record<ReadinessStepKey, (month: string) => string> = {
  shift: () => "Falta agregar un turno activo",
  publish: () => "Falta publicar el taller",
  month: (month) => `Falta abrir ${month}`,
  seats: (month) => `Faltan los cupos de ${month}`,
  materials: (month) => `Faltan los materiales de ${month}`,
  open: (month) => `Falta publicar ${month}`,
};

/**
 * The enrollment-readiness model: the ordered prerequisites an owner has to
 * complete before the public site accepts enrollments, each with one plain
 * call to action and the screen that completes it.
 */
export function workshopReadiness(input: ReadinessInput): Readiness {
  const name = monthName(input.month);
  const base = `/admin/talleres/${input.workshopId}`;
  const monthHref = `${base}/periodos/${input.month}`;
  const { period } = input;
  const steps: readonly ReadinessStep[] = [
    {
      key: "shift",
      label: "Tiene al menos un turno activo",
      done: input.activeTurnos > 0,
      cta: "Agregar un turno",
      href: `${base}/turnos`,
    },
    {
      key: "publish",
      label: "El taller está publicado",
      done: input.status === "published",
      cta: "Publicar el taller",
      href: `${base}#estado`,
    },
    {
      key: "month",
      label: `Abriste ${name}`,
      done: period !== null,
      cta: `Abrir inscripciones de ${name}`,
      href: `${base}/periodos`,
    },
    {
      key: "seats",
      label: `Definiste los cupos de ${name}`,
      done: period !== null && period.totalCapacity > 0,
      cta: "Definir los cupos",
      href: monthHref,
    },
    {
      key: "materials",
      label: "Los materiales están configurados",
      done:
        period !== null &&
        (!period.materialsRequired ||
          period.materialsCount === null ||
          period.materialsCount > 0),
      cta: "Elegir los materiales",
      href: monthHref,
    },
    {
      key: "open",
      label: `Inscripciones abiertas para ${name}`,
      done: period?.status === "open",
      cta: period?.status === "closed" ? "Ver el mes" : "Publicar el mes",
      href: monthHref,
    },
  ];
  const next = steps.find((step) => !step.done) ?? null;
  return {
    steps,
    next,
    complete: next === null,
    summary:
      next === null
        ? `Inscripciones abiertas para ${name}`
        : SUMMARIES[next.key](name),
    monthName: name,
  };
}
