import { Text } from "../atoms/text";

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group border-b border-tan-400 py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold text-ink-900 after:shrink-0 after:text-2xl after:font-normal after:text-clay-800 after:content-['+'] group-open:after:content-['\2212'] [&::-webkit-details-marker]:hidden">
        {question}
      </summary>
      <Text className="mt-3 max-w-prose">{answer}</Text>
    </details>
  );
}
