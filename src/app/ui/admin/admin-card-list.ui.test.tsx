import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminCardList } from "./admin-sections";

const empty = {
  title: "Nada",
  message: "Sin filas",
  action: { href: "/admin/x/nuevo", label: "Nuevo" },
};
const rows = [
  { id: "a", name: "Cerámica" },
  { id: "b", name: "Pintura" },
];

describe("AdminCardList tap targets", () => {
  it("makes the whole card a tap target with a chevron when rows have a destination", async () => {
    const { container } = render(
      <AdminCardList
        label="Talleres"
        rows={rows}
        rowKey={(row) => row.id}
        href={(row) => `/admin/talleres/${row.id}`}
        card={(row) => <a href={`/admin/talleres/${row.id}`}>{row.name}</a>}
        empty={empty}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const first = items[0] as HTMLElement;
    const overlay = first.querySelector("a[data-tap]") as HTMLAnchorElement;
    expect(overlay).toHaveAttribute("href", "/admin/talleres/a");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(overlay).toHaveAttribute("tabindex", "-1");
    expect(first).toHaveClass("admin-tap", "relative");
    expect(first.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    // The named link stays the single accessible destination.
    expect(within(first).getAllByRole("link")).toHaveLength(1);
    await expectNoAxeViolations(container);
  });

  it("keeps plain cards when rows have no destination", () => {
    render(
      <AdminCardList
        label="Talleres"
        rows={rows}
        rowKey={(row) => row.id}
        card={(row) => <p>{row.name}</p>}
        empty={empty}
      />,
    );
    const first = screen.getAllByRole("listitem")[0] as HTMLElement;
    expect(first.querySelector("a")).toBeNull();
    expect(first.querySelector("svg")).toBeNull();
  });
});
