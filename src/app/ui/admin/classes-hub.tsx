import { AdminHubCard } from "./action-card";
import { adminCopy } from "./copy";
import { AdminPageHeader } from "./admin-page";

const copy = adminCopy.clases.hub;

/**
 * Clases, for now: two cards to the existing screens. The real Clases screen
 * replaces this page; the old addresses keep working.
 */
export function AdminClassesHub() {
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader title={copy.title} />
      <ul aria-label={copy.title} className="grid gap-3 sm:grid-cols-2">
        <li>
          <AdminHubCard
            area="workshops"
            href="/admin/talleres"
            title={copy.talleres.title}
          />
        </li>
        <li>
          <AdminHubCard
            area="intensives"
            href="/admin/intensivos"
            title={copy.workshops.title}
          />
        </li>
      </ul>
    </section>
  );
}
