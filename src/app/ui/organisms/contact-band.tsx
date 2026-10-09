import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";
export function ContactBand({
  heading,
  body,
  whatsappHref,
  instagramHref,
}: {
  heading: string;
  body: string;
  whatsappHref: string;
  instagramHref?: string;
}) {
  return (
    <section>
      <Heading level={2}>{heading}</Heading>
      <Text>{body}</Text>
      <ButtonLink href={whatsappHref}>Escribinos por WhatsApp</ButtonLink>
      {instagramHref ? (
        <a href={instagramHref} rel="noopener noreferrer">
          Instagram
        </a>
      ) : null}
    </section>
  );
}
