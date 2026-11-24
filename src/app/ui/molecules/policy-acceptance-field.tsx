import { PublicCheckboxField } from "./public-fields";

const LINK =
  "text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

export interface PolicyAcceptanceFieldProps {
  /**
   * The versions of the two documents this page showed, posted back with the
   * form. Null when they could not be read: the form still renders, and the
   * server refuses a submit that carries none.
   */
  versions: {
    readonly conditionsVersion: number;
    readonly privacyVersion: number;
  } | null;
  error?: string | undefined;
}

/**
 * The one checkbox both public forms end with: it accepts the site-wide
 * conditions and privacy documents, each linked (in a new tab, so the typed
 * data stays), and carries the versions the page showed.
 */
export function PolicyAcceptanceField({
  versions,
  error,
}: PolicyAcceptanceFieldProps) {
  return (
    <>
      {versions ? (
        <>
          <input
            type="hidden"
            name="conditionsVersion"
            value={String(versions.conditionsVersion)}
          />
          <input
            type="hidden"
            name="privacyVersion"
            value={String(versions.privacyVersion)}
          />
        </>
      ) : null}
      <PublicCheckboxField
        id="policy"
        name="policy"
        required
        error={error}
        label={
          <span>
            Leí y acepto{" "}
            <a
              href="/condiciones"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              las condiciones
            </a>{" "}
            y{" "}
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              la política de privacidad
            </a>
          </span>
        }
      />
    </>
  );
}
