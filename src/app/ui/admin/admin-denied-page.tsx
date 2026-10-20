import { Heading, Text } from "../atoms/heading";
import { AdminNoIndex } from "./admin-shell";
import { adminMicrocopy } from "./microcopy";

/**
 * Minimal layout for a denial: the message, optionally the signed-in email so
 * a typo is visible, and no admin navigation or data.
 */
export function AdminDeniedPage({ email }: { email: string | null }) {
  const copy = adminMicrocopy.denied;
  return (
    <main className="mx-auto flex max-w-prose flex-col gap-4 px-gutter py-section">
      <AdminNoIndex />
      <Heading level={1}>{copy.title}</Heading>
      {email ? <Text>{copy.signedInAs(email)}</Text> : null}
      <Text>{copy.help}</Text>
      <a
        href="/"
        className="inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4"
      >
        {copy.backToSite}
      </a>
    </main>
  );
}
