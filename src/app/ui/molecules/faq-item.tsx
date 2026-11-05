import { Text } from "../atoms/text";

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="disclosure group border-b border-sand-300">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-xl font-semibold sm:text-2xl text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 after:grid after:size-11 after:shrink-0 after:place-items-center after:rounded-full after:bg-sage-200 after:text-2xl after:font-normal after:text-olive-800 after:content-['+'] group-open:after:content-['\2212'] [&::-webkit-details-marker]:hidden">
        {question}
      </summary>
      <Text className="max-w-prose pb-5">{answer}</Text>
    </details>
  );
}
