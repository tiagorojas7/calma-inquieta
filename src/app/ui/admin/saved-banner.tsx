import { Icon } from "../atoms/icon";
import { adminCopy } from "./copy";

/**
 * Tells the owner what was just saved, in a few words ("Guardado: cobro de
 * Ana"). It sits at the top of the page the form came back to and stays in
 * view while she scrolls. A screen passes the message for the code in the URL
 * (see `feedbackCode`) and nothing when there is none.
 */
export function SavedBanner({
  message,
}: {
  message: string | null | undefined;
}) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="sticky top-2 z-20 flex min-h-12 items-center gap-3 rounded-md bg-status-green-bg px-4 py-3 text-lg font-bold text-status-green-fg shadow-card"
    >
      <Icon name="check" size={24} aria-hidden="true" />
      <span>
        {adminCopy.common.saved}: {message}
      </span>
    </p>
  );
}
