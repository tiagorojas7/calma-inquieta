import type { AppServices } from "~/composition/request-services";
import type { PolicyKind } from "~/modules/policies";
import { dateTimeLabel } from "./order-labels";

/** The text of a document as paragraphs: blocks separated by blank lines. */
export function paragraphsOf(body: string): string[] {
  return body
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter((block) => block !== "");
}

/** "Versión 3 · publicada el 17/11/2026", on the Córdoba calendar day. */
export function versionLine(version: number, publishedAt: Date): string {
  return `Versión ${String(version)} · publicada el ${dateTimeLabel(publishedAt).slice(0, 10)}`;
}

export const POLICY_PAGES = {
  conditions: {
    path: "/condiciones",
    title: "Condiciones",
    description:
      "Las condiciones de los talleres y workshops de Calma Inquieta.",
  },
  privacy: {
    path: "/privacidad",
    title: "Política de privacidad",
    description: "Cómo usamos tus datos en Calma Inquieta.",
  },
} as const satisfies Record<
  PolicyKind,
  { path: string; title: string; description: string }
>;

/**
 * Loader data of a public document page: the current version of that document
 * as plain paragraphs, or null when the document cannot be read (the route
 * answers 503 rather than a page that pretends to be empty).
 */
export async function loadPolicyPage(services: AppServices, kind: PolicyKind) {
  const page = POLICY_PAGES[kind];
  const current = await services.policies.current();
  if (!current.ok) return null;
  const document = current.value[kind];
  const profile = await services.siteContent.getBusinessProfile();
  return {
    title: page.title,
    versionLine: versionLine(document.version, document.publishedAt),
    paragraphs: paragraphsOf(document.body),
    metaInput: {
      title: page.title,
      description: page.description,
      path: page.path,
      siteName: profile.name,
      baseUrl: services.site.baseUrl,
      indexingEnabled: services.site.indexingEnabled,
    },
  };
}
