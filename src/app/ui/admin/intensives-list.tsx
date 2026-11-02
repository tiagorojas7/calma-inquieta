import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

export interface IntensiveRow {
  readonly id: string;
  readonly name: string;
  readonly teacherName: string | null;
  readonly status: AdminStatus;
  readonly dateTime: string;
  readonly capacity: number;
}
type FilterKey = keyof typeof adminMicrocopy.intensives.filters;
const copy = adminMicrocopy.intensives;
const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";
/** Native anchors avoid the Worker gate's refusal of client `.data` requests. */
export function IntensivesList({
  rows,
  filter,
  feedback = null,
}: {
  rows: readonly IntensiveRow[];
  filter: FilterKey;
  feedback?: keyof typeof copy.feedback | null | undefined;
}) {
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
        actions={
          <AdminButtonLink href="/admin/intensivos/nuevo" variant="success">
            {copy.newAction}
          </AdminButtonLink>
        }
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback].title} />
      ) : null}
      <nav aria-label={copy.filterLabel}>
        <ul className="flex flex-wrap gap-4">
          {(Object.keys(copy.filters) as FilterKey[]).map((key) => (
            <li key={key}>
              <a
                href={`/admin/intensivos?estado=${key}`}
                aria-current={key === filter ? "page" : undefined}
                className={`${linkClasses} ${key === filter ? "font-semibold" : ""}`}
              >
                {copy.filters[key]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <AdminCardList
        label={copy.title}
        rows={rows}
        rowKey={(row) => row.id}
        href={(row) => `/admin/intensivos/${row.id}`}
        card={(row) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a href={`/admin/intensivos/${row.id}`} className={linkClasses}>
                {row.name}
              </a>
              <StatusBadge status={row.status} />
            </div>
            <Text tone="muted">{row.dateTime}</Text>
            <Text tone="muted">{row.teacherName ?? copy.noTeacher}</Text>
            <Text tone="muted">{copy.seats(row.capacity)}</Text>
          </>
        )}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: {
            href: "/admin/intensivos/nuevo",
            label: copy.newAction,
            variant: "success",
          },
        }}
      />
    </section>
  );
}
