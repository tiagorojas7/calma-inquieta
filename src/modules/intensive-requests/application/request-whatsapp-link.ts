import { formatPesos } from "~/modules/enrollments";
import { buildWhatsAppUrl } from "~/modules/site-content";
import type { PublicRequestView } from "./intensive-request-service";

/** "2026-11-14" becomes "14/11/2026". */
function localDate(isoDate: string): string {
  const [year = "", month = "", day = ""] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * The `wa.me` hand-off for a seat request, built from the business profile
 * number. Returns `null` when that number does not normalize, so the page can
 * render the summary without a link.
 */
export function buildRequestWhatsAppLink(
  request: PublicRequestView,
  profileWhatsApp: string,
): string | null {
  const url = buildWhatsAppUrl(
    profileWhatsApp,
    [
      "Hola! Quiero reservar mi lugar en un intensivo",
      `Solicitud: ${request.reference}`,
      `Nombre: ${request.studentName}`,
      `Intensivo: ${request.intensivoName}`,
      `Fecha: ${localDate(request.eventDate)}`,
      `Seña: ${formatPesos(request.deposit)}`,
    ].join("\n"),
  );
  return url.ok ? url.value : null;
}
