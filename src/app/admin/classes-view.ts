import type {
  IntensiveWorkshop,
  MonthlyWorkshopSummary,
  PeriodSummary,
} from "~/modules/workshops";
import type {
  DatedCardData,
  MonthlyCardData,
} from "~/app/ui/admin/classes-screen";
import { openableMonth } from "./next-month";
import { monthName } from "./workshop-readiness";

/** One free-seat line of a turno, from the month's occupancy. */
export interface TurnoSeats {
  readonly workshopId: string;
  readonly turnoId: string;
  readonly turnoLabel: string;
  readonly free: number;
}

/** What one taller card shows. "Abrir <mes>" follows `openableMonth`. */
export function monthlyCard(input: {
  workshop: MonthlyWorkshopSummary;
  periods: readonly PeriodSummary[];
  suggestedNext: string | null;
  month: string;
  seats: readonly TurnoSeats[];
}): MonthlyCardData {
  const { workshop, periods, suggestedNext, month } = input;
  const current = periods.find((period) => period.period === month);
  const openNext = openableMonth({
    workshopStatus: workshop.status,
    periods,
    suggestedNext,
  });
  const isOpen = current?.status === "open";
  return {
    id: workshop.id,
    name: workshop.name,
    teacherName: workshop.teacherName,
    status: workshop.status,
    openMonth: isOpen ? monthName(month) : null,
    turnos: isOpen
      ? input.seats
          .filter((row) => row.workshopId === workshop.id)
          .map((row) => ({
            id: row.turnoId,
            label: row.turnoLabel,
            free: row.free,
          }))
      : [],
    openNext,
  };
}

/** "5 dic 2026, 15:00" on the Córdoba wall clock. */
export function whenLabel(eventDate: string, startsAt: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(`${eventDate}T${startsAt}:00-03:00`));
}

/** A workshop is over once its day passed or it was cancelled or archived. */
export function isPastWorkshop(
  workshop: Pick<IntensiveWorkshop, "eventDate" | "status">,
  today: string,
): boolean {
  return (
    workshop.eventDate < today ||
    workshop.status === "cancelled" ||
    workshop.status === "archived"
  );
}

export function datedCard(input: {
  workshop: IntensiveWorkshop;
  taken: number;
  pending: number;
  reservations: DatedCardData["reservations"];
}): DatedCardData {
  const { workshop } = input;
  return {
    id: workshop.id,
    name: workshop.name,
    teacherName: workshop.assignment?.teacher.name ?? null,
    when: whenLabel(workshop.eventDate, workshop.startsAt),
    status: workshop.status,
    capacity: workshop.capacity,
    taken: input.taken,
    pending: input.pending,
    reservations: input.reservations,
  };
}
