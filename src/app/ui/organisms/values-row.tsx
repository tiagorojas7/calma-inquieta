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

/** Disc colours cycle sand, clay, olive; the icons are decorative. */
const DISCS = [
  { tone: "sand", classes: "bg-sand-300 text-clay-800" },
  { tone: "clay", classes: "bg-clay-600 text-white" },
  { tone: "olive", classes: "bg-olive-800 text-canvas" },
] as const;

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
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, at) => {
            const disc = DISCS[at % DISCS.length] ?? DISCS[0];
            return (
              <Reveal
                as="li"
                key={item.id}
                index={at}
                className="flex gap-5 sm:flex-col sm:gap-4"
              >
                <span
                  data-disc={disc.tone}
                  className={`flex size-16 shrink-0 items-center justify-center rounded-full ${disc.classes}`}
                >
                  <Icon
                    name={ICONS[at % ICONS.length] ?? "leaf"}
                    className="size-8"
                  />
                </span>
                <div className="flex flex-col gap-2">
                  <Heading level={3}>{item.title}</Heading>
                  <Text>{item.text}</Text>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
