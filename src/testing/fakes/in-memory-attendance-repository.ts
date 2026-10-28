import { err, ok, type Result } from "~/modules/_shared";
import type {
  AttendanceRepository,
  MakeUpExists,
  SessionKey,
  StoredMakeUp,
  StoredMark,
} from "~/modules/attendance";

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Marks and make-ups in memory, ordered like the database adapter. */
export class InMemoryAttendanceRepository implements AttendanceRepository {
  readonly marks: StoredMark[] = [];
  readonly makeUps = new Map<string, StoredMakeUp>();

  replaceSession(
    session: SessionKey,
    marks: readonly StoredMark[],
  ): Promise<void> {
    const keep = this.marks.filter(
      (mark) =>
        mark.periodId !== session.periodId ||
        mark.turnoId !== session.turnoId ||
        mark.date !== session.date,
    );
    this.marks.length = 0;
    this.marks.push(...keep, ...marks);
    return Promise.resolve();
  }

  marksForTurno(
    periodId: string,
    turnoId: string,
  ): Promise<readonly StoredMark[]> {
    return Promise.resolve(
      this.marks
        .filter((m) => m.periodId === periodId && m.turnoId === turnoId)
        .sort((a, b) => compare(a.date, b.date) || compare(a.email, b.email)),
    );
  }

  marksByStudent(email: string): Promise<readonly StoredMark[]> {
    return Promise.resolve(
      this.marks
        .filter((m) => m.email === email)
        .sort(
          (a, b) => compare(a.date, b.date) || compare(a.turnoId, b.turnoId),
        ),
    );
  }

  insertMakeUp(value: StoredMakeUp): Promise<Result<void, MakeUpExists>> {
    const duplicate = [...this.makeUps.values()].some(
      (m) =>
        m.email === value.email &&
        m.periodId === value.periodId &&
        m.turnoId === value.turnoId &&
        m.date === value.date,
    );
    if (duplicate) return Promise.resolve(err({ kind: "make-up-exists" }));
    this.makeUps.set(value.id, value);
    return Promise.resolve(ok(undefined));
  }

  private ordered(select: (m: StoredMakeUp) => boolean): StoredMakeUp[] {
    return [...this.makeUps.values()]
      .filter(select)
      .sort(
        (a, b) => compare(a.makeUpDate, b.makeUpDate) || compare(a.id, b.id),
      );
  }

  listMakeUps(status: "pending" | "done" | "all") {
    return Promise.resolve(
      this.ordered((m) => status === "all" || m.status === status),
    );
  }

  makeUpsByStudent(email: string) {
    return Promise.resolve(this.ordered((m) => m.email === email));
  }

  makeUpsForTurno(periodId: string, turnoId: string) {
    return Promise.resolve(
      this.ordered((m) => m.periodId === periodId && m.turnoId === turnoId),
    );
  }

  completeMakeUp(
    id: string,
    change: { readonly by: string; readonly at: Date },
  ): Promise<StoredMakeUp | null> {
    const stored = this.makeUps.get(id);
    if (!stored) return Promise.resolve(null);
    if (stored.status === "done") return Promise.resolve(stored);
    const next: StoredMakeUp = {
      ...stored,
      status: "done",
      doneBy: change.by,
      doneAt: change.at,
    };
    this.makeUps.set(id, next);
    return Promise.resolve(next);
  }
}
