import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";

interface ValueEntry {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export function ValuesRow({
  heading,
  items,
}: {
  heading: string;
  items: readonly ValueEntry[];
}) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-6 py-section">
      <Heading level={2}>{heading}</Heading>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-md bg-sand-100 p-6"
          >
            <Heading level={3}>{item.title}</Heading>
            <Text>{item.text}</Text>
          </li>
        ))}
      </ul>
    </section>
  );
}
