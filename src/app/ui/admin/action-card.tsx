import type { ReactNode } from "react";
import { Heading } from "../atoms/heading";
import { AreaChip } from "./admin-area";
import type { AdminAreaKey } from "./admin-areas";
import {
  ADMIN_CARD_TITLE,
  ADMIN_TAP_CARD,
  AdminTapTarget,
} from "./admin-sections";

export interface AdminCardLink {
  readonly label: string;
  readonly href: string;
}

const secondaryLink =
  "inline-flex min-h-12 items-center rounded-md px-2 text-lg font-semibold text-clay-800 underline underline-offset-4 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * One thing to act on: a title, one line of facts, one primary action and, if
 * needed, a few plain links. The primary action is whatever the caller passes
 * (an `AdminButton` inside its own native form, or an `AdminButtonLink`), so
 * the card never decides how the action is sent. Give it an `id` and a form's
 * `ReturnToFields` anchor to the same value: after the post the page returns to
 * this very card.
 */
export function AdminActionCard({
  id,
  title,
  summary,
  summaryTone = "neutral",
  facts,
  area,
  primary,
  secondary,
  headingLevel = 3,
}: {
  /** The anchor id of this item. */
  id?: string | undefined;
  title: string;
  /** Key amount or count, before any secondary detail. */
  summary?: ReactNode | undefined;
  summaryTone?: "owed" | "paid" | "neutral" | undefined;
  /** One short line: the amount, the date, the state. */
  facts?: ReactNode | undefined;
  /** Shows the area's colored icon chip before the title. */
  area?: AdminAreaKey | undefined;
  primary: ReactNode;
  secondary?: readonly AdminCardLink[] | undefined;
  headingLevel?: 2 | 3 | 4;
}) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <article
      {...(id ? { id } : {})}
      {...(titleId ? { "aria-labelledby": titleId } : {})}
      aria-label={titleId ? undefined : title}
      className="flex scroll-mt-20 flex-col gap-3 rounded-md bg-surface p-5 shadow-card"
    >
      <div className="flex items-center gap-3">
        {area ? <AreaChip area={area} size={28} /> : null}
        <div className="flex min-w-0 flex-col gap-1">
          <Heading
            level={headingLevel}
            size="h4"
            data-card-title=""
            {...(titleId ? { id: titleId } : {})}
          >
            {title}
          </Heading>
        </div>
      </div>
      {summary ? (
        <p
          data-summary-tone={summaryTone}
          className={`text-2xl font-bold tabular-nums ${summaryTone === "owed" ? "text-admin-warning-fg" : summaryTone === "paid" ? "text-admin-positive-fg" : "text-admin-neutral-fg"}`}
        >
          {summary}
        </p>
      ) : null}
      {facts ? (
        <p data-facts className="text-lg text-ink-700">
          {facts}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {primary}
        {secondary?.map((link) => (
          <a key={link.href} href={link.href} className={secondaryLink}>
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );
}

/**
 * A whole card that is one link to another page: the title opens it, a few
 * words under the title say what is there. Place it inside a list item.
 */
export function AdminHubCard({
  title,
  hint,
  href,
  area,
}: {
  title: string;
  /** A few words, never a sentence. */
  hint?: string | undefined;
  href: string;
  area: AdminAreaKey;
}) {
  return (
    <div
      className={`flex min-h-20 items-center gap-4 rounded-md bg-surface p-4 shadow-card ${ADMIN_TAP_CARD}`}
    >
      <AreaChip area={area} size={32} className="p-3" />
      <div className="flex min-w-0 flex-col">
        <a href={href} className={ADMIN_CARD_TITLE}>
          {title}
        </a>
        {hint ? <p className="text-lg text-ink-700">{hint}</p> : null}
      </div>
      <AdminTapTarget href={href} />
    </div>
  );
}
