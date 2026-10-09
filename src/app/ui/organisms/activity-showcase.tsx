import { Heading } from "../atoms/heading";
import { ActivityCard } from "../molecules/activity-card";
import { EmptyState } from "../molecules/empty-state";
type Activity = Parameters<typeof ActivityCard>[0] & { id: string };
export function ActivityShowcase({
  title = "Talleres mensuales",
  items,
  emptyMessage = "Pronto vamos a compartir nuevas propuestas.",
}: {
  title?: string;
  items: readonly Activity[];
  emptyMessage?: string;
}) {
  return (
    <section>
      <Heading level={2}>{title}</Heading>
      {items.length ? (
        <div>
          {items.map(({ id, ...item }) => (
            <ActivityCard key={id} {...item} />
          ))}
        </div>
      ) : (
        <EmptyState
          message={emptyMessage}
          actions={[{ href: "/contacto", label: "Escribinos" }]}
        />
      )}
    </section>
  );
}
