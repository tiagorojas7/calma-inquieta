import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";
export function AboutTeaser({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <section className="flex max-w-prose flex-col items-start gap-4 py-section">
      <Heading level={2}>{heading}</Heading>
      <Text>{body}</Text>
      <ButtonLink href="/quienes-somos" variant="text-arrow">
        Conocé quiénes somos
      </ButtonLink>
    </section>
  );
}
