import type { PropsWithChildren } from "react";
import { Text } from "../atoms/heading";
import { AreaChip } from "./admin-area";
import type { AdminAreaKey } from "./admin-areas";
import { AdminPageHeader } from "./admin-page";
import {
  ADMIN_CARD_TITLE,
  AdminCardList,
  AdminSection,
} from "./admin-sections";
import { adminMicrocopy } from "./microcopy";

export interface NoveltyCardProps {
  /** The menu section the notice belongs to: it picks the chip icon and tint. */
  readonly area: AdminAreaKey;
  readonly key: string;
  readonly href: string;
  readonly name: string;
  readonly kindLabel: string;
  readonly detail: string | null;
  readonly receivedAt: string;
}

export interface PaymentCardProps {
  /** The menu section the notice belongs to: it picks the chip icon and tint. */
  readonly area: AdminAreaKey;
  readonly key: string;
  readonly href: string;
  readonly name: string;
  readonly owedLabel: string;
  readonly amount: string;
  readonly detail: string | null;
}

export interface AdminNotificationsProps {
  readonly novelties: readonly NoveltyCardProps[];
  readonly payments: readonly PaymentCardProps[];
}

const copy = adminMicrocopy.notifications;

/**
 * The chip repeats the icon and tint of the section in the menu. It is
 * decorative: the kind of notice is always written next to it, so colour is
 * never the only signal.
 */
function NoticeBody({
  area,
  children,
}: PropsWithChildren<{ area: AdminAreaKey }>) {
  return (
    <div className="flex items-start gap-3">
      <AreaChip area={area} size={20} className="p-2" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * The bell page: what nobody opened yet, then every payment still owed. Plain
 * anchors only: the Worker gate refuses the `.data` requests a client
 * navigation makes. Looking at the page marks nothing read; opening a request
 * does.
 */
export function AdminNotifications({
  novelties,
  payments,
}: AdminNotificationsProps) {
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        description={copy.subtitle}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
      />
      <AdminSection
        title={copy.newSection.title}
        description={copy.newSection.description}
        actions={
          novelties.length > 0 ? (
            <Text tone="muted">{copy.newSection.count(novelties.length)}</Text>
          ) : null
        }
      >
        <AdminCardList
          label={copy.list.news}
          rows={novelties}
          rowKey={(row) => row.key}
          href={(row) => row.href}
          empty={{
            title: copy.newSection.empty.title,
            message: copy.newSection.empty.message,
            action: { href: "/admin", label: copy.newSection.empty.action },
          }}
          card={(row) => (
            <NoticeBody area={row.area}>
              <a href={row.href} className={ADMIN_CARD_TITLE}>
                {row.name}
              </a>
              <Text tone="muted">{row.kindLabel}</Text>
              {row.detail ? <Text>{row.detail}</Text> : null}
              <Text tone="muted">
                {copy.received}: {row.receivedAt}
              </Text>
            </NoticeBody>
          )}
        />
      </AdminSection>
      <AdminSection
        title={copy.paymentsSection.title}
        description={copy.paymentsSection.description}
        actions={
          payments.length > 0 ? (
            <Text tone="muted">
              {copy.paymentsSection.count(payments.length)}
            </Text>
          ) : null
        }
      >
        <AdminCardList
          label={copy.list.payments}
          rows={payments}
          rowKey={(row) => row.key}
          href={(row) => row.href}
          empty={{
            title: copy.paymentsSection.empty.title,
            message: copy.paymentsSection.empty.message,
            action: {
              href: "/admin/inscripciones",
              label: copy.paymentsSection.empty.action,
            },
          }}
          card={(row) => (
            <NoticeBody area={row.area}>
              <a href={row.href} className={ADMIN_CARD_TITLE}>
                {row.name}
              </a>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Text>{row.owedLabel}</Text>
                <p className="font-display text-xl font-semibold text-ink-900">
                  {row.amount}
                </p>
              </div>
              {row.detail ? <Text tone="muted">{row.detail}</Text> : null}
            </NoticeBody>
          )}
        />
      </AdminSection>
    </div>
  );
}
