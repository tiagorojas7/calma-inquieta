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
    <section className="flex flex-col gap-6 py-section">
      <Heading level={2}>{heading}</Heading>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map(({ id, ...item }) => (
          <TestimonialCard key={id} {...item} />
        ))}
      </div>
    </section>
  );
}
