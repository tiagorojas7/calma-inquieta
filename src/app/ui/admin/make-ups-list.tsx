import { AdminButton as Button } from "./admin-button";
import { Heading, Text } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.attendance.makeUps;

export interface MakeUpRow {
  readonly id: string;
  readonly student: string;
  readonly email: string;
  readonly absence: string;
  readonly makeUp: string;
  /** Who closed it as done or missed, and when; `null` while it is pending. */
  readonly doneNote: string | null;
}

/** Texts of the missed outcome, supplied by the screen's loader. */
export interface MissedText {
  readonly title: string;
  readonly action: string;
  /** Names the form of one student as `<actionPrefix>: <student>`. */
  readonly actionPrefix: string;
  readonly marked: string;
  readonly closed: string;
}

export interface MakeUpsListProps {
  readonly missedText: MissedText;
  readonly pending: readonly MakeUpRow[];
  readonly done: readonly MakeUpRow[];
  /** Students who did not come; shown only when there are any. */
  readonly missed?: readonly MakeUpRow[] | undefined;
  /** True right after one make-up was marked as done. */
  readonly completed?: boolean | undefined;
  /** Right after a make-up was marked missed, or an action found it closed. */
  readonly notice?: "missed" | "closed" | undefined;
}

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function MakeUpCard({
  row,
  pending,
  missedText,
}: {
  row: MakeUpRow;
  pending: boolean;
  missedText: MissedText;
}) {
  return (
    <>
      <a
        href={`/admin/alumnas/${encodeURIComponent(row.email)}`}
        className={linkClasses}
      >
        {row.student}
      </a>
      <dl className="grid gap-1 text-sm text-ink-700">
        <div>
          <dt className="font-semibold">{copy.columns.absence}</dt>
          <dd>{row.absence}</dd>
        </div>
        <div>
          <dt className="font-semibold">{copy.columns.makeUp}</dt>
          <dd>{row.makeUp}</dd>
        </div>
      </dl>
      {pending ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form method="post" aria-label={copy.markDoneFor(row.student)}>
            <input type="hidden" name="intent" value="complete" />
            <input type="hidden" name="id" value={row.id} />
            <Button type="submit" variant="success">
              {copy.markDone}
            </Button>
          </form>
          <form
            method="post"
            aria-label={`${missedText.actionPrefix}: ${row.student}`}
          >
            <input type="hidden" name="intent" value="missed" />
            <input type="hidden" name="id" value={row.id} />
            <Button type="submit" variant="secondary">
              {missedText.action}
            </Button>
          </form>
        </div>
      ) : (
        <Text tone="muted">{row.doneNote ?? ""}</Text>
      )}
    </>
  );
}

const empty = (title: string) => ({
  title,
  message: copy.empty.message,
  action: { href: "/admin/asistencia", label: copy.empty.action },
});

/** Pending, done and missed make-up classes; closing one is a plain native post. */
export function MakeUpsList({
  missedText,
  pending,
  done,
  missed = [],
  completed,
  notice,
}: MakeUpsListProps) {
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: adminMicrocopy.attendance.title, href: "/admin/asistencia" },
          { label: copy.title },
        ]}
        back={{ href: "/admin/asistencia", label: copy.back }}
      />
      {completed ? (
        <AdminFeedback tone="success" title={copy.completed} />
      ) : null}
      {notice === "missed" ? (
        <AdminFeedback tone="success" title={missedText.marked} />
      ) : null}
      {notice === "closed" ? (
        <AdminFeedback tone="error" title={missedText.closed} />
      ) : null}
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.pendingTitle}</Heading>
        <AdminCardList
          label={copy.pendingTitle}
          rows={pending}
          rowKey={(row) => row.id}
          card={(row) => (
            <MakeUpCard row={row} pending missedText={missedText} />
          )}
          empty={empty(copy.emptyPending)}
        />
      </section>
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.doneTitle}</Heading>
        <AdminCardList
          label={copy.doneTitle}
          rows={done}
          rowKey={(row) => row.id}
          card={(row) => (
            <MakeUpCard row={row} pending={false} missedText={missedText} />
          )}
          empty={empty(copy.emptyDone)}
        />
      </section>
      {missed.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Heading level={2}>{missedText.title}</Heading>
          <AdminCardList
            label={missedText.title}
            rows={missed}
            rowKey={(row) => row.id}
            card={(row) => (
              <MakeUpCard row={row} pending={false} missedText={missedText} />
            )}
            empty={empty(missedText.title)}
          />
        </section>
      ) : null}
    </section>
  );
}
