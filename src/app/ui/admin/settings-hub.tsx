import { AdminHubCard } from "./action-card";
import type { AdminAreaKey } from "./admin-areas";
import { adminCopy } from "./copy";
import { AdminPageHeader } from "./admin-page";

const copy = adminCopy.ajustes.hub;

/** Every former menu entry that is not one of the four sections. */
const CARDS: readonly {
  readonly key: keyof typeof copy.cards;
  readonly href: string;
  readonly area: AdminAreaKey;
}[] = [
  { key: "teachers", href: "/admin/profesores", area: "teachers" },
  {
    key: "suppliers",
    href: "/admin/materiales/proveedores",
    area: "suppliers",
  },
  { key: "policies", href: "/admin/politicas", area: "policies" },
  { key: "statistics", href: "/admin/estadisticas", area: "statistics" },
  { key: "events", href: "/admin/eventos", area: "events" },
  { key: "reminders", href: "/admin/recordatorios", area: "reminders" },
  { key: "enrollments", href: "/admin/inscripciones", area: "enrollments" },
];

/** Ajustes: large cards to what is not used every day. Plain anchors only. */
export function AdminSettingsHub() {
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader title={copy.title} />
      <ul aria-label={copy.title} className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <li key={card.key}>
            <AdminHubCard
              area={card.area}
              href={card.href}
              title={copy.cards[card.key].title}
              hint={copy.cards[card.key].hint}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
