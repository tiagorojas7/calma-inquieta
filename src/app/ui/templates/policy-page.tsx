import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";

export interface PolicyPageProps {
  title: string;
  /** "Versión N · publicada el DD/MM/AAAA". */
  versionLine: string;
  /** The document as plain text blocks: rendered as text, never as markup. */
  paragraphs: readonly string[];
}

/** A site-wide document (conditions or privacy) with the version being shown. */
export function PolicyPage({
  title,
  versionLine,
  paragraphs,
}: PolicyPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-prose flex-col gap-6 pt-page-top pb-section">
      <header className="flex flex-col gap-2">
        <Heading level={1}>{title}</Heading>
        <Text tone="muted">{versionLine}</Text>
      </header>
      {paragraphs.map((paragraph, index) => (
        <Text key={index} className="whitespace-pre-line">
          {paragraph}
        </Text>
      ))}
    </main>
  );
}
