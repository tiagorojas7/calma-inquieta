import { buildWhatsAppUrl } from "~/modules/site-content";
import { buildOrderWhatsAppText } from "../domain/whatsapp-message";
import type { PublicOrderView } from "./public-enrollment-service";

/**
 * The `wa.me` hand-off for an order, built from the business profile number.
 * Returns `null` when that number does not normalize, so the page can render
 * the summary without a link.
 */
export function buildOrderWhatsAppLink(
  order: PublicOrderView,
  profileWhatsApp: string,
): string | null {
  const url = buildWhatsAppUrl(
    profileWhatsApp,
    buildOrderWhatsAppText({
      orderNumber: order.number,
      studentName: order.studentName,
      workshopName: order.workshopName,
      periodKey: order.period,
      turnoLabel: order.turnoLabel,
      lines: order.lines,
      total: order.total,
    }),
  );
  return url.ok ? url.value : null;
}
