import { Heading, Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { adminMicrocopy } from "./microcopy";

/**
 * Error content for the admin boundary: Spanish, generic, no internals. The
 * retry is a plain link to the failed URL, so it works without client routing.
 */
export function AdminErrorState({
  status,
  retryHref = "/admin",
}: {
  status: number;
  retryHref?: string | undefined;
}) {
  const copy = adminMicrocopy.errors;
  const text = status === 503 ? copy.unavailable : copy.generic;
  return (
    <section className="flex max-w-prose flex-col gap-4">
      <Heading level={1}>{text.title}</Heading>
      <Text>{text.message}</Text>
      <div className="flex flex-wrap items-center gap-3">
        <AdminButtonLink href={retryHref}>{copy.retry}</AdminButtonLink>
        <AdminButtonLink variant="outline" href="/admin">
          {copy.backToPanel}
        </AdminButtonLink>
      </div>
      <Text tone="muted">{copy.support}</Text>
    </section>
  );
}
