import axe from "axe-core";

export interface AxeOptions {
  /**
   * Page-level renders also run the `region` rule (all content inside a
   * landmark). Fragments leave it off: a lone atom is not a page.
   */
  readonly page?: boolean;
}

/**
 * Fails when axe-core finds an accessibility violation in `container`. The
 * `color-contrast` rule is off on purpose: jsdom has no layout, so contrast is
 * covered by the token gate (design DS2), not by rendered pages.
 */
export async function expectNoAxeViolations(
  container: Element,
  { page = false }: AxeOptions = {},
): Promise<void> {
  // axe runs page-level rules (`region`) only when the context is the whole
  // document, so a page render is checked from its owner document.
  const results = await axe.run(page ? container.ownerDocument : container, {
    rules: {
      "color-contrast": { enabled: false },
      // The document shell (title, lang) belongs to root.tsx, not to a page render.
      "document-title": { enabled: false },
      "html-has-lang": { enabled: false },
      region: { enabled: page },
    },
  });
  if (results.violations.length === 0) {
    return;
  }
  const report = results.violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => node.target.join(" "))
        .join("; ");
      return `${violation.id}: ${violation.help} (${targets})`;
    })
    .join("\n");
  throw new Error(`Accessibility violations:\n${report}`);
}
