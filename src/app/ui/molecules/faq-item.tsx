import { Text } from "../atoms/text";

export function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group rounded-md bg-sand-100 px-5 py-5 shadow-card transition-shadow open:bg-blush-100 open:shadow-lift">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold sm:text-2xl text-ink-900 after:grid after:size-11 after:shrink-0 after:place-items-center after:rounded-full after:bg-clay-600 after:text-2xl after:font-normal after:text-white after:content-['+'] group-open:after:content-['\2212'] [&::-webkit-details-marker]:hidden">
        {question}
      </summary>
      <Text className="mt-3 max-w-prose">{answer}</Text>
    </details>
  );
}
