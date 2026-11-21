import type { ReactNode } from "react";
import { Heading } from "../atoms/heading";
import { AdminActionCard } from "./action-card";
import { AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { ReservationList } from "./classes-reservations";
import { adminCopy } from "./copy";
import { ReturnToFields } from "./form-fields";
import type {
  IntensiveRequestFeedback,
  IntensiveRequestGroup,
} from "./intensive-requests";
import { SavedBanner } from "./saved-banner";

const copy = adminCopy.clases;

const linkClasses =
  "inline-flex min-h-12 items-center rounded-md px-2 text-lg font-semibold text-clay-800 underline underline-offset-4 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

export interface MonthlyCardData {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string | null;
  readonly status: "draft" | "published" | "paused" | "archived";
  /** Name of the current month when its enrollment is open, else null. */
  readonly openMonth: string | null;
  readonly turnos: readonly {
    readonly id: string;
    readonly label: string;
    readonly free: number;
  }[];
  /** The next month nobody has opened yet, opened in one tap. */
  readonly openNext: {
    readonly period: string;
    readonly label: string;
  } | null;
}

export interface DatedCardData {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string | null;
  readonly when: string;
  readonly status: "draft" | "published" | "paused" | "cancelled" | "archived";
  readonly capacity: number;
  readonly taken: number;
  readonly pending: number;
  /** Set only on the card whose reservations are open. */
  readonly reservations: {
    readonly today: string;
    readonly groups: readonly IntensiveRequestGroup[];
  } | null;
}

/** The Clases address with the open reservations and the past list kept. */
export function classesPath(options: {
  open?: string | null | undefined;
  past?: boolean | undefined;
}): string {
  const query = new URLSearchParams();
  if (options.open) query.set("abrir", options.open);
  if (options.past) query.set("anteriores", "1");
  const text = query.toString();
  return text === "" ? "/admin/clases" : `/admin/clases?${text}`;
}

export interface ClassesScreenData {
  readonly saved: keyof typeof copy.saved | null;
  readonly showPast: boolean;
  readonly openId: string | null;
  readonly monthly: readonly MonthlyCardData[];
  readonly dated: readonly DatedCardData[];
  readonly pastMonthly: readonly MonthlyCardData[];
  readonly pastDated: readonly DatedCardData[];
}

export const monthlyAnchor = (id: string) => `taller-${id}`;
export const datedAnchor = (id: string) => `workshop-${id}`;

function MonthlyCard({
  card,
  showPast,
}: {
  card: MonthlyCardData;
  showPast: boolean;
}) {
  const m = copy.monthly;
  const state =
    card.status === "published"
      ? card.openMonth === null
        ? m.noMonthOpen
        : m.openLine(card.openMonth)
      : m.status[card.status];
  const firstTurno = card.turnos[0];
  return (
    <AdminActionCard
      id={monthlyAnchor(card.id)}
      title={card.name}
      area="workshops"
      summary={
        firstTurno ? m.seats(firstTurno.label, firstTurno.free) : m.noMonthOpen
      }
      facts={`${card.teacherName ?? m.noTeacher} · ${state}`}
      headingLevel={3}
      primary={
        <div className="flex w-full flex-col gap-3">
          {card.turnos.length > 1 ? (
            <ul className="flex flex-col gap-1 text-lg text-ink-900">
              {card.turnos.slice(1).map((turno) => (
                <li key={turno.id}>{m.seats(turno.label, turno.free)}</li>
              ))}
            </ul>
          ) : null}
          {card.openNext ? (
            <form method="post" className="flex">
              <input type="hidden" name="intent" value="open-month" />
              <input type="hidden" name="workshopId" value={card.id} />
              <input type="hidden" name="period" value={card.openNext.period} />
              <ReturnToFields
                to={classesPath({ past: showPast })}
                anchor={monthlyAnchor(card.id)}
              />
              <AdminButton type="submit" variant="success">
                {m.openMonth(card.openNext.label)}
              </AdminButton>
            </form>
          ) : null}
          <div>
            <a href={`/admin/talleres/${card.id}`} className={linkClasses}>
              {m.edit}
            </a>
          </div>
        </div>
      }
    />
  );
}

function DatedCard({
  card,
  showPast,
  feedback,
  justCancelled,
}: {
  card: DatedCardData;
  showPast: boolean;
  feedback: IntensiveRequestFeedback | undefined;
  justCancelled: boolean;
}) {
  const d = copy.dated;
  const open = card.reservations !== null;
  return (
    <AdminActionCard
      id={datedAnchor(card.id)}
      title={card.name}
      area="intensives"
      summary={d.seats(card.taken, card.capacity)}
      summaryTone="neutral"
      facts={[
        card.when,
        card.status === "published" ? null : d.status[card.status],
        card.pending > 0 ? d.pending(card.pending) : null,
      ]
        .filter((part): part is string => part !== null)
        .join(" · ")}
      headingLevel={3}
      primary={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <AdminButtonLink
              href={`${classesPath({
                open: open ? null : card.id,
                past: showPast,
              })}#${datedAnchor(card.id)}`}
              variant={open ? "secondary" : "primary"}
            >
              {open ? d.hideReservations : d.showReservations}
            </AdminButtonLink>
            <a href={`/admin/intensivos/${card.id}`} className={linkClasses}>
              {d.edit}
            </a>
          </div>
          {card.reservations ? (
            <ReservationList
              intensivoId={card.id}
              today={card.reservations.today}
              groups={card.reservations.groups}
              returnTo={classesPath({ open: card.id, past: showPast })}
              feedback={feedback}
              justCancelled={justCancelled}
            />
          ) : null}
        </div>
      }
    />
  );
}

function CardList({
  title,
  empty,
  children,
  count,
}: {
  title: string;
  empty: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <Heading level={2} size="h3">
        {title}
      </Heading>
      {count === 0 ? (
        <p className="text-lg text-ink-700">{empty}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Clases: the monthly workshops and the dated ones in one place. A dated
 * workshop opens its reservations on its own card; every action is a native
 * post that comes back to the same card and the same person.
 */
export function AdminClassesScreen({
  data,
  feedback,
}: {
  data: ClassesScreenData;
  feedback?: IntensiveRequestFeedback | undefined;
}) {
  const { showPast } = data;
  const cancelled = data.saved === "cancelled";
  const datedCards = (cards: readonly DatedCardData[]) =>
    cards.map((card) => (
      <DatedCard
        key={card.id}
        card={card}
        showPast={showPast}
        feedback={card.reservations === null ? undefined : feedback}
        justCancelled={cancelled}
      />
    ));
  const monthlyCards = (cards: readonly MonthlyCardData[]) =>
    cards.map((card) => (
      <MonthlyCard key={card.id} card={card} showPast={showPast} />
    ));
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={copy.page.title}
        actions={
          <div className="flex flex-wrap gap-3">
            <AdminButtonLink href="/admin/talleres/nuevo" variant="secondary">
              {copy.page.newTaller}
            </AdminButtonLink>
            <AdminButtonLink href="/admin/intensivos/nuevo" variant="secondary">
              {copy.page.newWorkshop}
            </AdminButtonLink>
          </div>
        }
      />
      <SavedBanner message={data.saved ? copy.saved[data.saved] : null} />
      <CardList
        title={copy.page.monthlyTitle}
        empty={copy.page.emptyMonthly}
        count={data.monthly.length}
      >
        {monthlyCards(data.monthly)}
      </CardList>
      <CardList
        title={copy.page.datedTitle}
        empty={copy.page.emptyDated}
        count={data.dated.length}
      >
        {datedCards(data.dated)}
      </CardList>
      {showPast ? (
        <>
          <CardList
            title={`${copy.page.pastTitle}: ${copy.page.monthlyTitle}`}
            empty={copy.page.emptyMonthly}
            count={data.pastMonthly.length}
          >
            {monthlyCards(data.pastMonthly)}
          </CardList>
          <CardList
            title={`${copy.page.pastTitle}: ${copy.page.datedTitle}`}
            empty={copy.page.emptyDated}
            count={data.pastDated.length}
          >
            {datedCards(data.pastDated)}
          </CardList>
        </>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <a href={classesPath({ past: !showPast })} className={linkClasses}>
          {showPast ? copy.page.hidePast : copy.page.showPast}
        </a>
        <a href="/admin/asistencia" className={linkClasses}>
          {copy.page.attendance}
        </a>
      </div>
    </section>
  );
}
