const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * Fills the `{key}` tokens of a content template. A token without a value is
 * a defect in the caller, so it throws instead of leaking `{key}` into a page
 * or a WhatsApp message. Values are inserted literally, never re-expanded.
 */
export function fillCopyTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  return template.replace(PLACEHOLDER, (_token, key: string) => {
    if (!Object.hasOwn(values, key)) {
      throw new Error(`Missing value for the copy placeholder {${key}}`);
    }
    return values[key] as string;
  });
}
