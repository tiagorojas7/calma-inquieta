/**
 * Embeds pre-serialized JSON-LD. Serializing is the caller's job; as defense in
 * depth every `<` is escaped again (JSON only holds `<` inside strings, so
 * `<` is equivalent), so the text can never close the script element.
 */
export function JsonLdScript({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json.replaceAll("<", "\\u003c") }}
    />
  );
}
