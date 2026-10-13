import { Heading } from "../atoms/heading";
import { FaqItem } from "../molecules/faq-item";

interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export function FaqList({
  heading,
  items,
}: {
  heading: string;
  items: readonly FaqEntry[];
}) {
  if (!items.length) return null;
  return (
    <section className="flex max-w-prose flex-col gap-2 py-section">
      <Heading level={2}>{heading}</Heading>
      {items.map(({ id, question, answer }) => (
        <FaqItem key={id} question={question} answer={answer} />
      ))}
    </section>
  );
}
