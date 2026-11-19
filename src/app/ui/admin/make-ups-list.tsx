import { AdminButton as Button } from "./admin-button";
import { Heading, Text } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { adminCopy } from "./copy";
import { ReturnToFields } from "./form-fields";
import { SavedBanner } from "./saved-banner";

const copy = adminCopy.clases.makeUps;

/** This page, so every post comes back to it at the same make-up. */
export const MAKE_UPS_PATH = "/admin/asistencia/recuperaciones";
export const makeUpAnchor = (id: string) => `recuperacion-${id}`;

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
      <dl className="grid gap-2 text-lg text-ink-700">
        <div>
          <dt className="font-semibold">{copy.absence}</dt>
          <dd>{row.absence}</dd>
        </div>
        <div>
          <dt className="font-semibold">{copy.makeUp}</dt>
          <dd>{row.makeUp}</dd>
        </div>
      </dl>
      {pending ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form method="post" aria-label={`${copy.markDone}: ${row.student}`}>
            <input type="hidden" name="intent" value="complete" />
            <input type="hidden" name="id" value={row.id} />
            <ReturnToFields to={MAKE_UPS_PATH} anchor={makeUpAnchor(row.id)} />
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
            <ReturnToFields to={MAKE_UPS_PATH} anchor={makeUpAnchor(row.id)} />
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

/** Cards of one list, or a few words when it is empty. */
function Cards({
  label,
  rows,
  pending,
  missedText,
  emptyText,
}: {
  label: string;
  rows: readonly MakeUpRow[];
  pending: boolean;
  missedText: MissedText;
  emptyText: string;
}) {
  if (rows.length === 0) return <Text tone="muted">{emptyText}</Text>;
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {rows.map((row) => (
        <li
          key={row.id}
          id={makeUpAnchor(row.id)}
          className="scroll-mt-20 flex flex-col gap-3 rounded-md bg-surface p-5 shadow-card"
        >
          <MakeUpCard row={row} pending={pending} missedText={missedText} />
        </li>
      ))}
    </ul>
  );
}

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
        back={{ href: "/admin/asistencia", label: copy.back }}
      />
      <SavedBanner
        message={
          completed ? copy.completed : notice === "missed" ? copy.missed : null
        }
      />
      {notice === "closed" ? (
        <AdminFeedback tone="error" title={copy.closed} />
      ) : null}
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.pendingTitle}</Heading>
        <Cards
          label={copy.pendingTitle}
          rows={pending}
          pending
          missedText={missedText}
          emptyText={copy.emptyPending}
        />
      </section>
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.doneTitle}</Heading>
        <Cards
          label={copy.doneTitle}
          rows={done}
          pending={false}
          missedText={missedText}
          emptyText={copy.emptyDone}
        />
      </section>
      {missed.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Heading level={2}>{missedText.title}</Heading>
          <Cards
            label={missedText.title}
            rows={missed}
            pending={false}
            missedText={missedText}
            emptyText={missedText.title}
          />
        </section>
      ) : null}
    </section>
  );
}
