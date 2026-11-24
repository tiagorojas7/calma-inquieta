import { Text } from "../atoms/heading";
import { AdminButton } from "./admin-button";
import { ADMIN_CARD_TITLE, ADMIN_SHEET } from "./admin-sections";
import { TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

export interface TeacherWorkshopRow {
  readonly id: string;
  readonly name: string;
  readonly status: AdminStatus;
  /** The percentage as the form accepts it back; empty when unset. */
  readonly percentage: string;
}

export interface TeacherPercentageError {
  readonly workshopId: string;
  readonly value: string;
  readonly message: string;
}

const copy = adminMicrocopy.teachers.workshops;

/**
 * The monthly workshops a teacher has now, each with its agreed percentage.
 * Each row is its own native post form (the Worker gate denies `.data`
 * requests), so saving one never touches the others. An own teacher has no
 * percentage, so her rows only link to the workshop.
 */
export function TeacherWorkshopsPanel({
  workshops,
  percentageApplies,
  error,
}: {
  workshops: readonly TeacherWorkshopRow[];
  percentageApplies: boolean;
  error?: TeacherPercentageError | undefined;
}) {
  return (
    <section className={ADMIN_SHEET} aria-labelledby="teacher-workshops">
      <h2 id="teacher-workshops" className="font-display text-xl text-ink-900">
        {copy.title}
      </h2>
      {workshops.length === 0 ? (
        <Text tone="muted">{copy.empty}</Text>
      ) : (
        <>
          {percentageApplies ? (
            <Text tone="muted">
              {adminMicrocopy.workshops.form.percentageNote}
            </Text>
          ) : null}
          <ul className="flex flex-col gap-3">
            {workshops.map((workshop) => {
              const refused =
                error?.workshopId === workshop.id ? error : undefined;
              return (
                <li
                  key={workshop.id}
                  className="flex flex-col gap-3 rounded-md border border-admin-line p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={`/admin/talleres/${workshop.id}`}
                      className={ADMIN_CARD_TITLE}
                    >
                      {workshop.name}
                    </a>
                    <StatusBadge status={workshop.status} />
                  </div>
                  {percentageApplies ? (
                    <form
                      method="post"
                      noValidate
                      aria-label={copy.formLabel(workshop.name)}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <input type="hidden" name="intent" value="percentage" />
                      <input
                        type="hidden"
                        name="workshopId"
                        value={workshop.id}
                      />
                      <TextField
                        label={copy.percentage}
                        name="percentage"
                        inputMode="decimal"
                        defaultValue={refused?.value ?? workshop.percentage}
                        error={refused?.message}
                      />
                      <AdminButton type="submit" variant="secondary">
                        {copy.save}
                      </AdminButton>
                    </form>
                  ) : (
                    <Text tone="muted">{copy.ownNote}</Text>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
