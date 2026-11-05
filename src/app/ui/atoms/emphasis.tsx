/**
 * The last word of a title takes the accent italic the site uses for its key
 * word (`h1 em`, `h2 em` in app.css). Content stays whole: only the markup
 * around the last word changes. A single word is emphasized entirely.
 */
export function EmphasizedLastWord({ text }: { text: string }) {
  const cut = text.trimEnd().lastIndexOf(" ") + 1;
  return (
    <>
      {text.slice(0, cut)}
      <em>{text.slice(cut).trimEnd()}</em>
    </>
  );
}
