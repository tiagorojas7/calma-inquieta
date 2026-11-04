import type { PropsWithChildren } from "react";
import { EmphasizedLastWord } from "../atoms/emphasis";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";

/**
 * The only `h1` of a catalog listing; cards below it use `h2`. A multi-word
 * title takes the accent italic on its last word; a one-word title stays
 * plain, so a whole title is never set in the accent colour.
 */
export function CatalogListingPage({
  heading,
  intro,
  children,
}: PropsWithChildren<{ heading: string; intro: string }>) {
  return (
    <section className="flex flex-col gap-8 py-section">
      <header className="flex max-w-3xl flex-col gap-4">
        <Heading level={1}>
          {heading.trim().includes(" ") ? (
            <EmphasizedLastWord text={heading} />
          ) : (
            heading
          )}
        </Heading>
        <Text className="text-lead">{intro}</Text>
      </header>
      {children}
    </section>
  );
}
