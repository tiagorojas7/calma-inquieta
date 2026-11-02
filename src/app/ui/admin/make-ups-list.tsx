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
  /** Who completed it and when; `null` while it is pending. */
  readonly doneNote: string | null;
}

export interface MakeUpsListProps {
  readonly pending: readonly MakeUpRow[];
  readonly done: readonly MakeUpRow[];
  /** True right after one make-up was marked as done. */
  readonly completed?: boolean | undefined;
}

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function MakeUpCard({ row, pending }: { row: MakeUpRow; pending: boolean }) {
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
        <form method="post" aria-label={copy.markDoneFor(row.student)}>
          <input type="hidden" name="intent" value="complete" />
          <input type="hidden" name="id" value={row.id} />
          <Button type="submit" variant="success">
            {copy.markDone}
          </Button>
        </form>
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

/** Pending and done make-up classes; completing one is a plain native post. */
export function MakeUpsList({ pending, done, completed }: MakeUpsListProps) {
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
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.pendingTitle}</Heading>
        <AdminCardList
          label={copy.pendingTitle}
          rows={pending}
          rowKey={(row) => row.id}
          card={(row) => <MakeUpCard row={row} pending />}
          empty={empty(copy.emptyPending)}
        />
      </section>
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.doneTitle}</Heading>
        <AdminCardList
          label={copy.doneTitle}
          rows={done}
          rowKey={(row) => row.id}
          card={(row) => <MakeUpCard row={row} pending={false} />}
          empty={empty(copy.emptyDone)}
        />
      </section>
    </section>
  );
}
