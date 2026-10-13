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
    <section className="flex flex-col items-start gap-4 rounded-md bg-sand-200 px-gutter py-12">
      <Heading level={2}>{heading}</Heading>
      <Text>{body}</Text>
      <div className="flex flex-wrap items-center gap-4">
        <ButtonLink href={whatsappHref}>Escribinos por WhatsApp</ButtonLink>
        {instagramHref ? (
          <a
            href={instagramHref}
            rel="noopener noreferrer"
            className="min-h-11 content-center text-clay-800 underline underline-offset-4"
          >
            Instagram
          </a>
        ) : null}
      </div>
    </section>
  );
}
