import { Heading } from "../atoms/heading";
import { ActivityCard } from "../molecules/activity-card";
import { EmptyState } from "../molecules/empty-state";
type Activity = Parameters<typeof ActivityCard>[0] & { id: string };
export function ActivityShowcase({
  title = "Talleres mensuales",
  items,
  emptyMessage = "Pronto vamos a compartir nuevas propuestas.",
  emptyAction,
}: {
  title?: string;
  items: readonly Activity[];
  emptyMessage?: string;
  emptyAction: { href: string; label: string };
}) {
  return (
    <section className="flex flex-col gap-module">
      <Heading level={2}>{title}</Heading>
      {items.length ? (
        <div className="grid gap-6 md:grid-cols-3">
          {items.map(({ id, ...item }) => (
            <ActivityCard key={id} {...item} />
          ))}
        </div>
      ) : (
        <EmptyState message={emptyMessage} actions={[emptyAction]} />
      )}
    </section>
  );
}
