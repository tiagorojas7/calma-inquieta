import { Text } from "../atoms/text";

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="border-b border-tan-400 py-4">
      <summary className="cursor-pointer font-semibold text-ink-900">
        {question}
      </summary>
      <Text className="mt-3">{answer}</Text>
    </details>
  );
}
