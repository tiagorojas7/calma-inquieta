export function TestimonialCard({
  quote,
  author,
}: {
  quote: string;
  author: string;
}) {
  return (
    <figure className="flex flex-col gap-4 rounded-md bg-surface p-6 shadow-card">
      <blockquote className="text-ink-700">{quote}</blockquote>
      <figcaption className="font-semibold text-ink-900">{author}</figcaption>
    </figure>
  );
}
