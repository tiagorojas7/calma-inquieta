import { Heading } from "../atoms/heading";
import { TestimonialCard } from "../molecules/testimonial-card";
type Testimonial = Parameters<typeof TestimonialCard>[0] & { id: string };
export function TestimonialsSection({
  heading,
  items,
}: {
  heading: string;
  items: readonly Testimonial[];
}) {
  if (!items.length) return null;
  return (
    <section>
      <Heading level={2}>{heading}</Heading>
      <div>
        {items.map(({ id, ...item }) => (
          <TestimonialCard key={id} {...item} />
        ))}
      </div>
    </section>
  );
}
