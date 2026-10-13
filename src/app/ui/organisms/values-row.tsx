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
    <section>
      <Heading level={2}>{heading}</Heading>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Heading level={3}>{item.title}</Heading>
            <Text>{item.text}</Text>
          </li>
        ))}
      </ul>
    </section>
  );
}
