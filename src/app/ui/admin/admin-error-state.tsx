import { Heading, Text } from "../atoms/heading";
import { adminMicrocopy } from "./microcopy";

/** Error content for the admin boundary: Spanish, generic, no internals. */
export function AdminErrorState({ status }: { status: number }) {
  const copy = adminMicrocopy.errors;
  const text = status === 503 ? copy.unavailable : copy.generic;
  return (
    <section className="flex max-w-prose flex-col gap-4">
      <Heading level={1}>{text.title}</Heading>
      <Text>{text.message}</Text>
      <a
        href="/admin"
        className="inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4"
      >
        {copy.backToPanel}
      </a>
    </section>
  );
}
