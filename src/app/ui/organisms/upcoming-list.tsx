import { Heading } from "../atoms/heading";
import { EmptyState } from "../molecules/empty-state";
import { UpcomingItem } from "../molecules/upcoming-item";
type Item = Parameters<typeof UpcomingItem>[0] & { id: string };
export function UpcomingList({
  items,
  title = "Próximos intensivos",
  emptyAction,
}: {
  items: readonly Item[];
  title?: string;
  emptyAction: { href: string; label: string };
}) {
  return (
    <section className="flex flex-col gap-module">
      <Heading level={2}>{title}</Heading>
      {items.length ? (
        <div className="flex flex-col">
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
