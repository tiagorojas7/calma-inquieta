import type { AppServices } from "~/composition/request-services";
import type { AdminActor } from "~/modules/admin-access";
import { isSessionDate } from "~/modules/attendance";
import type { TodayClass } from "./hoy-view";

/**
 * The classes held today (a Córdoba calendar day, `YYYY-MM-DD`): every turno
 * of a published or closed month whose weekday falls on that date. The
 * students are the roster of the attendance sheet, so the count is the one
 * the owner sees when she opens it. A schedule that cannot be read must not
 * hide the rest of Hoy, so it yields no class; a roster that cannot be read
 * only drops the count.
 */
export async function loadClassesToday(
  services: Pick<AppServices, "attendance">,
  actor: AdminActor,
  today: string,
): Promise<readonly TodayClass[]> {
  try {
    const listed = await services.attendance.listTurnos(actor);
    if (!listed.ok) return [];
    const held = listed.value
      .filter((turno) => isSessionDate(turno.period, turno.weekday, today))
      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
    return await Promise.all(
      held.map(async (turno) => {
        const students = await services.attendance
          .sheet(actor, turno.periodId, turno.turnoId, today)
          .then((sheet) => (sheet.ok ? sheet.value.rows.length : null))
          .catch(() => null);
        return {
          periodId: turno.periodId,
          turnoId: turno.turnoId,
          workshopName: turno.workshopName,
          turnoLabel: turno.turnoLabel,
          startsAt: turno.startsAt,
          endsAt: turno.endsAt,
          students,
        };
      }),
    );
  } catch {
    return [];
  }
}
