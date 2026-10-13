import type { ReactNode } from "react";
import { ButtonLink } from "../atoms/button";
import { Eyebrow, Heading, Text } from "../atoms/heading";
import { HeroCollage } from "./hero-collage";
type Slot = { src: string; alt: string; width: number; height: number };
type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  images: readonly Slot[];
  bajada: string;
};
export function HeroSection({
  eyebrow,
  title,
  subtitle,
  images,
  bajada,
}: Props) {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid items-center gap-10 py-section lg:grid-cols-2 lg:gap-16"
    >
      <div className="flex flex-col items-start gap-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} id="hero-title">
          {title}
        </Heading>
        <Text className="max-w-prose text-lead">{subtitle}</Text>
        <div className="flex flex-wrap gap-4">
          <ButtonLink href="/talleres">Ver talleres</ButtonLink>
          <ButtonLink href="/intensivos" variant="outline">
            Ver intensivos
          </ButtonLink>
        </div>
        <Text
          tone="muted"
          className="mt-4 w-full max-w-prose border-t border-tan-400 pt-6"
        >
          {bajada}
        </Text>
      </div>
      <HeroCollage images={images} />
    </section>
  );
}
