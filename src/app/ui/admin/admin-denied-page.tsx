import { Heading, Text } from "../atoms/heading";
import { ADMIN_SIGN_OUT_HREF, AdminNoIndex } from "./admin-shell";
import { adminMicrocopy } from "./microcopy";

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * Minimal layout for a denial: the message, optionally the signed-in email so
 * a typo is visible, a way to switch account or ask for access, and no admin
 * navigation or data.
 */
export function AdminDeniedPage({
  email,
  whatsappHref = null,
}: {
  email: string | null;
  whatsappHref?: string | null | undefined;
}) {
  const copy = adminMicrocopy.denied;
  return (
    <main className="mx-auto flex max-w-prose flex-col gap-4 px-gutter py-section">
      <AdminNoIndex />
      <Heading level={1}>{copy.title}</Heading>
      {email ? <Text>{copy.signedInAs(email)}</Text> : null}
      <Text>{copy.help}</Text>
      <div className="flex flex-col gap-1">
        {whatsappHref ? (
          <a href={whatsappHref} className={linkClasses}>
            {copy.requestAccess}
          </a>
        ) : null}
        <a href={ADMIN_SIGN_OUT_HREF} className={linkClasses}>
          {copy.signOut}
        </a>
        <a href="/" className={linkClasses}>
          {copy.backToSite}
        </a>
      </div>
    </main>
  );
}
