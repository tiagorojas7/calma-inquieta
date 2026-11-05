import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Text } from "../atoms/text";
import { Reveal } from "./reveal";
import { Section } from "./section";

interface ValueEntry {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

/** The icons are decorative; each sits on the same calm sage chip. */
const ICONS = ["leaf", "group", "hands", "heart"] as const;

export function ValuesRow({
  heading,
  items,
}: {
  heading: string;
  items: readonly ValueEntry[];
}) {
  if (!items.length) return null;
  return (
    <Section bleed tone="sand" spacing="lg">
      <div className="flex flex-col gap-10">
        <Reveal>
          <Heading level={2}>{heading}</Heading>
        </Reveal>
        <ul className="grid sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4">
          {items.map((item, at) => (
            <Reveal as="li" key={item.id} index={at} className="h-full">
              <div className="flex h-full gap-4 border-t border-sand-300 py-6 sm:flex-col sm:gap-3">
                <span
                  data-value-mark
                  className="flex size-12 shrink-0 items-center justify-center rounded-md bg-sage-200 text-olive-800"
                >
                  <Icon
                    name={ICONS[at % ICONS.length] ?? "leaf"}
                    className="size-6"
                  />
                </span>
                <div className="flex flex-col gap-2">
                  <Heading level={3}>{item.title}</Heading>
                  <Text>{item.text}</Text>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
