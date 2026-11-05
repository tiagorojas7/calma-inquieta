import { Heading } from "../atoms/heading";
import { FaqItem } from "../molecules/faq-item";
import { Reveal } from "./reveal";
import { Section } from "./section";

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
    <Section bleed tone="white" spacing="lg">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <Reveal>
          <Heading level={2}>{heading}</Heading>
        </Reveal>
        <div className="flex flex-col border-t border-sand-300">
          {items.map(({ id, question, answer }, at) => (
            <Reveal key={id} index={at}>
              <FaqItem question={question} answer={answer} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
