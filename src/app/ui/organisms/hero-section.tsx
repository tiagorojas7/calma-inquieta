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
    <section aria-labelledby="hero-title">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading level={1} id="hero-title">
        {title}
      </Heading>
      <Text>{subtitle}</Text>
      <div>
        <ButtonLink href="/talleres">Ver talleres</ButtonLink>
        <ButtonLink href="/intensivos" variant="outline">
          Ver intensivos
        </ButtonLink>
      </div>
      <HeroCollage images={images} />
      <Text tone="muted">{bajada}</Text>
    </section>
  );
}
