import { Text } from "../atoms/text";

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details>
      <summary>{question}</summary>
      <Text>{answer}</Text>
    </details>
  );
}
