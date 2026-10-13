import { ButtonLink } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";

/** Empty list: says what is missing and links to create the first record. */
export function AdminEmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action: { href: string; label: string };
}) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-md bg-surface p-6 shadow-card">
      <Heading level={2} size="h3">
        {title}
      </Heading>
      <Text>{message}</Text>
      <ButtonLink href={action.href}>{action.label}</ButtonLink>
    </section>
  );
}
