import { ButtonLink } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";

type ComingSoonPageProps = {
  title: string;
  message: string;
  whatsappHref: string;
  instagramHref: string;
};

export function ComingSoonPage({
  title,
  message,
  whatsappHref,
  instagramHref,
}: ComingSoonPageProps) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 py-section">
      <Heading level={1}>{title}</Heading>
      <Text>{message}</Text>
      <div className="flex flex-wrap gap-4">
        <ButtonLink href={whatsappHref}>WhatsApp</ButtonLink>
        <ButtonLink href={instagramHref} variant="outline">
          Instagram
        </ButtonLink>
      </div>
    </section>
  );
}
