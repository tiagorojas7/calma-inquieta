import type { CatalogContent } from "~/modules/site-content";
import { buildWhatsAppUrl, fillCopyTemplate } from "~/modules/site-content";
import { microcopy } from "~/app/ui/microcopy";
import { formatEventDate, formatTimeRange, weekdayName } from "./format";

export type ActivityMessage =
  | { kind: "taller"; name: string }
  | {
      kind: "turno";
      name: string;
      weekday: number;
      startsAt: string;
      endsAt: string;
    }
  | { kind: "intensivo"; name: string; date: string }
  | { kind: "paused"; name: string };

export interface ActivityLink {
  readonly href: string;
  readonly label: string;
}

function messageText(
  message: ActivityMessage,
  templates: CatalogContent["messages"],
): string {
  switch (message.kind) {
    case "taller":
      return fillCopyTemplate(templates.taller, { nombre: message.name });
    case "turno":
      return fillCopyTemplate(templates.turno, {
        nombre: message.name,
        dia: weekdayName(message.weekday).toLowerCase(),
        horario: formatTimeRange(message.startsAt, message.endsAt),
      });
    case "intensivo":
      return fillCopyTemplate(templates.intensivo, {
        nombre: message.name,
        fecha: formatEventDate(message.date).toLowerCase(),
      });
    case "paused":
      return fillCopyTemplate(templates.paused, { nombre: message.name });
  }
}

/**
 * The prefilled WhatsApp link of an activity. The number only ever appears
 * inside the returned link; an invalid number degrades to the Instagram link.
 */
export function buildActivityWhatsAppUrl({
  profile,
  content,
  message,
}: {
  profile: { whatsappDisplay: string; instagramUrl: string };
  content: CatalogContent;
  message: ActivityMessage;
}): ActivityLink {
  const url = buildWhatsAppUrl(
    profile.whatsappDisplay,
    messageText(message, content.messages),
  );
  if (!url.ok) {
    return { href: profile.instagramUrl, label: microcopy.followInstagram };
  }
  return {
    href: url.value,
    label:
      message.kind === "paused"
        ? content.shared.pausedLinkLabel
        : content.shared.inquiryCta,
  };
}
