import { Heading } from "../atoms/heading";
import { TestimonialCard } from "../molecules/testimonial-card";
import { Reveal } from "./reveal";
import { Section } from "./section";
type Testimonial = Parameters<typeof TestimonialCard>[0] & { id: string };

/**
 * Testimonials on a full-bleed canvas band (S11): a large decorative quote
 * mark gives the band weight, and the cards (white, on the canvas) reveal
 * with a stagger. Renders nothing until a consented testimonial exists.
 */
export function TestimonialsSection({
  heading,
  items,
}: {
  heading: string;
  items: readonly Testimonial[];
}) {
  if (!items.length) return null;
  return (
    <Section bleed tone="canvas" spacing="lg" className="overflow-x-clip">
      <div className="relative flex flex-col gap-8">
        <span aria-hidden="true" className="testimonial-mark" />
        <Reveal>
          <Heading level={2}>{heading}</Heading>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map(({ id, ...item }, index) => (
            <Reveal key={id} index={index + 1}>
              <TestimonialCard {...item} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
