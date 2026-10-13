export function TestimonialCard({
  quote,
  author,
}: {
  quote: string;
  author: string;
}) {
  return (
    <figure>
      <blockquote>{quote}</blockquote>
      <figcaption>{author}</figcaption>
    </figure>
  );
}
