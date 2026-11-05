import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";
import { EmptyState } from "../molecules/empty-state";
import { UpcomingItem } from "../molecules/upcoming-item";
type Item = Parameters<typeof UpcomingItem>[0] & { id: string };
export function UpcomingList({
  items,
  title = "Próximos workshops",
  description,
  emptyAction,
}: {
  items: readonly Item[];
  title?: string;
  /** One line under the title saying what these events are. */
  description?: string | undefined;
  emptyAction: { href: string; label: string };
}) {
  return (
    <section className="flex flex-col gap-module">
      <header className="flex flex-col gap-3">
        <Heading level={2}>{title}</Heading>
        {description ? (
          <Text className="max-w-prose text-lead">{description}</Text>
        ) : null}
      </header>
      {items.length ? (
        <div className="flex flex-col gap-4">
          {items.map(({ id, ...item }) => (
            <UpcomingItem key={id} {...item} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Pronto vamos a anunciar nuevas fechas."
          actions={[emptyAction]}
        />
      )}
    </section>
  );
}
