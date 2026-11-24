import type { ReactNode } from "react";
import { Heading } from "../atoms/heading";
import { AdminActionCard, AdminHubCard } from "./action-card";
import { adminButtonClasses, AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { ADMIN_CARD_GRID } from "./admin-sections";
import {
  ADMIN_TONE_FILL,
  ADMIN_TONE_TEXT,
  type AdminTone,
} from "./admin-tones";
import { hoyCopy } from "./copy/hoy";
import { FormError, ReturnToFields } from "./form-fields";
import { MoreOptions } from "./more-options";
import type { NoveltyCardProps } from "./notifications";
import { SavedBanner } from "./saved-banner";
import type { AdminAreaKey } from "./admin-areas";

const copy = hoyCopy;

interface CardBase {
  /** The element id and the anchor the post returns to. */
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  readonly facts: string;
  readonly area: AdminAreaKey;
}

export type TodoCard =
  | (CardBase & {
      readonly kind: "form";
      /** What Hoy's action does with the post. */
      readonly intent: string;
      /** The button label. */
      readonly label: string;
      /** The button label with who it is for, for screen readers. */
      readonly ariaLabel: string;
      readonly fields: Readonly<Record<string, string>>;
    })
  | (CardBase & {
      readonly kind: "event";
      readonly href: string;
      readonly whatsappHref: string | undefined;
    })
  | (CardBase & {
      readonly kind: "link";
      readonly label: string;
      readonly href: string;
    });

export interface ClassCard {
  readonly key: string;
  readonly title: string;
  readonly facts: string;
  readonly href: string;
}

export interface HoyScreen {
  readonly monthLabel: string;
  readonly figures: {
    readonly collected: string;
    readonly toCollect: string;
    readonly studio: string;
    /** A month at a loss reads as money out. */
    readonly studioTone: "income" | "expense";
  };
  readonly more: {
    readonly occupancy: string;
    readonly occupancyDetail: string;
    readonly teachers: string;
    readonly statisticsHref: string;
  };
  readonly todo: {
    readonly cards: readonly TodoCard[];
    /** Where "Ver todo" goes; null when every card is already shown. */
    readonly seeAllHref: string | null;
  };
  readonly classes: readonly ClassCard[];
  readonly novelties: readonly NoveltyCardProps[];
  /** Whether the bell page holds more than the cards shown. */
  readonly moreNews: boolean;
}

/** A refusal to show on the card it belongs to. */
export interface HoyFailure {
  /** The card's id: the anchor its form posted. */
  readonly card: string;
  readonly message: string;
}

export interface HoyProps {
  readonly screen: HoyScreen;
  /** This page's path and query, so a post comes back to the same view. */
  readonly returnTo: string;
  /** What was just saved, or null. */
  readonly saved: string | null;
  readonly failure: HoyFailure | null;
}

function Figure({
  label,
  value,
  tone,
  fill = false,
}: {
  label: string;
  value: string;
  tone: AdminTone;
  fill?: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-1 rounded-md p-5 shadow-card ${fill ? ADMIN_TONE_FILL[tone] : "bg-surface"}`}
    >
      <p className="text-lg font-semibold text-ink-900">{label}</p>
      <p
        className={`font-display text-4xl font-semibold tabular-nums lining-nums ${ADMIN_TONE_TEXT[tone]}`}
      >
        {value}
      </p>
    </li>
  );
}

function Numbers({ screen }: { screen: HoyScreen }) {
  const { figures, more } = screen;
  return (
    <section aria-labelledby="hoy-numeros" className="flex flex-col gap-3">
      <Heading level={2} id="hoy-numeros" className="capitalize">
        {screen.monthLabel}
      </Heading>
      <ul className="grid gap-3 sm:grid-cols-3">
        <Figure
          label={copy.figures.collected}
          value={figures.collected}
          tone="income"
        />
        <Figure
          label={copy.figures.toCollect}
          value={figures.toCollect}
          tone="pending"
        />
        <Figure
          label={copy.figures.studio}
          value={figures.studio}
          tone={figures.studioTone}
          fill
        />
      </ul>
      <MoreOptions label={copy.more.label}>
        <dl className="flex flex-col gap-2 text-lg text-ink-900">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt>{copy.more.occupancy}</dt>
            <dd className="font-semibold">
              {more.occupancy}{" "}
              <span className="font-normal text-ink-700">
                ({more.occupancyDetail})
              </span>
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt>{copy.more.teachers}</dt>
            <dd className="font-semibold">{more.teachers}</dd>
          </div>
        </dl>
        <div>
          <AdminButtonLink href={more.statisticsHref} variant="secondary">
            {copy.more.statistics}
          </AdminButtonLink>
        </div>
      </MoreOptions>
    </section>
  );
}

function Task({
  card,
  returnTo,
  failure,
}: {
  card: TodoCard;
  returnTo: string;
  failure: HoyFailure | null;
}) {
  const common = {
    id: card.id,
    title: card.title,
    summary: card.summary,
    summaryTone: card.summary ? ("owed" as const) : ("neutral" as const),
    facts: card.facts === "" ? undefined : card.facts,
    area: card.area,
  };
  if (card.kind === "link")
    return (
      <AdminActionCard
        {...common}
        primary={
          <AdminButtonLink href={card.href} variant="secondary">
            {card.label}
          </AdminButtonLink>
        }
      />
    );
  if (card.kind === "event")
    return (
      <AdminActionCard
        {...common}
        primary={
          <>
            <AdminButtonLink href={card.href}>
              {copy.todo.seeRequest}
            </AdminButtonLink>
            {card.whatsappHref ? (
              <a
                href={card.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${copy.todo.whatsapp}: ${card.title}`}
                className={adminButtonClasses.secondary}
              >
                {copy.todo.whatsapp}
              </a>
            ) : null}
          </>
        }
      />
    );
  const message = failure?.card === card.id ? failure.message : undefined;
  return (
    <AdminActionCard
      {...common}
      primary={
        <div className="flex w-full flex-col gap-3">
          <form method="post" action="?index" className="flex">
            <input type="hidden" name="intent" value={card.intent} />
            {Object.entries(card.fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <ReturnToFields to={returnTo} anchor={card.id} />
            <AdminButton type="submit" aria-label={card.ariaLabel}>
              {card.label}
            </AdminButton>
          </form>
          <FormError message={message} />
        </div>
      }
    />
  );
}

function ToDo({
  screen,
  returnTo,
  failure,
}: {
  screen: HoyScreen;
  returnTo: string;
  failure: HoyFailure | null;
}) {
  const { cards, seeAllHref } = screen.todo;
  // A refusal can leave no card behind (a fee that was already paid): it
  // is shown above the list instead of being lost.
  const orphan =
    failure !== null && !cards.some((card) => card.id === failure.card)
      ? failure.message
      : undefined;
  return (
    <section
      id="para-hacer"
      aria-labelledby="hoy-para-hacer"
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <Heading level={2} id="hoy-para-hacer">
        {copy.todo.title}
      </Heading>
      <FormError message={orphan} />
      {cards.length === 0 ? (
        <p className="text-lg text-ink-900">{copy.todo.empty}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {cards.map((card) => (
            <li key={card.id} className="grid">
              <Task card={card} returnTo={returnTo} failure={failure} />
            </li>
          ))}
        </ul>
      )}
      {seeAllHref ? (
        <div>
          <AdminButtonLink href={seeAllHref} variant="secondary">
            {copy.todo.seeAll}
          </AdminButtonLink>
        </div>
      ) : null}
    </section>
  );
}

function ClassItem({ item }: { item: ClassCard }) {
  return (
    <AdminActionCard
      title={item.title}
      summary={item.facts}
      area="attendance"
      primary={
        <AdminButtonLink href={item.href}>
          {copy.classes.takeAttendance}
        </AdminButtonLink>
      }
    />
  );
}

function Classes({ items }: { items: readonly ClassCard[] }) {
  return (
    <section aria-labelledby="hoy-clases" className="flex flex-col gap-3">
      <Heading level={2} id="hoy-clases">
        {copy.classes.title}
      </Heading>
      {items.length === 0 ? (
        <p className="text-lg text-ink-900">{copy.classes.empty}</p>
      ) : (
        <ul className={ADMIN_CARD_GRID}>
          {items.map((item) => (
            <li key={item.key}>
              <ClassItem item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function News({ screen }: { screen: HoyScreen }): ReactNode {
  return (
    <section
      id="nuevo"
      aria-labelledby="hoy-nuevo"
      className="flex scroll-mt-20 flex-col gap-3"
    >
      <Heading level={2} id="hoy-nuevo">
        {copy.news.title}
      </Heading>
      {screen.novelties.length === 0 ? (
        <p className="text-lg text-ink-900">{copy.news.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {screen.novelties.map((item) => (
            <li key={item.key}>
              <AdminHubCard
                title={item.name}
                hint={[item.kindLabel, item.detail]
                  .filter((part) => part !== null)
                  .join(" · ")}
                href={item.href}
                area={item.area}
              />
            </li>
          ))}
        </ul>
      )}
      {screen.moreNews ? (
        <div>
          <AdminButtonLink href="/admin/novedades" variant="secondary">
            {copy.news.seeAll}
          </AdminButtonLink>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Hoy, the landing page: the month's numbers, what to do (each card with its
 * button right there), today's classes and what is new. Forms are native
 * posts that come back to this page at the same card; links are plain
 * anchors, since the Worker gate refuses the `.data` requests a client
 * navigation would make.
 */
export function Hoy({ screen, returnTo, saved, failure }: HoyProps) {
  return (
    <div className="flex flex-col gap-8">
      <SavedBanner message={saved} />
      <AdminPageHeader title={copy.title} />
      <Numbers screen={screen} />
      <ToDo screen={screen} returnTo={returnTo} failure={failure} />
      <Classes items={screen.classes} />
      <News screen={screen} />
    </div>
  );
}
