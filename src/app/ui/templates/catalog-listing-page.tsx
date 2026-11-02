import type { PropsWithChildren } from "react";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";

/** The only `h1` of a catalog listing; cards below it use `h2`. */
export function CatalogListingPage({
  heading,
  intro,
  children,
}: PropsWithChildren<{ heading: string; intro: string }>) {
  return (
    <section className="flex flex-col gap-8 py-section">
      <header className="flex max-w-3xl flex-col gap-4">
        <Heading level={1}>{heading}</Heading>
        <Text className="text-lead">{intro}</Text>
      </header>
      {children}
    </section>
  );
}
