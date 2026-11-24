import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  AdminColumns,
  AdminSection,
  AdminSectionHeading,
} from "./admin-sections";

describe("AdminSectionHeading", () => {
  it("is a level-2 heading by default, with its actions beside it", async () => {
    const { container } = render(
      <AdminSectionHeading
        title="Para hacer"
        actions={<a href="/admin/alumnas">Ver todo</a>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Para hacer" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver todo" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("takes a level and an id, so a section can name itself", () => {
    render(<AdminSectionHeading title="Hoy" level={3} id="h" />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Hoy" }),
    ).toHaveAttribute("id", "h");
  });

  it("only writes the description when there is one", () => {
    const { container } = render(<AdminSectionHeading title="Hoy" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("is what AdminSection shows for its own title", () => {
    render(
      <AdminSection title="Clases">
        <p>contenido</p>
      </AdminSection>,
    );
    expect(screen.getByRole("region", { name: "Clases" })).toBeVisible();
  });
});

describe("AdminColumns", () => {
  it("keeps both columns in reading order and stacks them below a desktop", () => {
    render(
      <AdminColumns
        start={
          <label>
            Nombre <input />
          </label>
        }
        end={
          <label>
            Imagen <input />
          </label>
        }
      />,
    );
    const name = screen.getByLabelText("Nombre");
    const image = screen.getByLabelText("Imagen");
    expect(
      name.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const grid = name.closest("[data-columns]");
    expect(grid?.className).toContain("lg:grid-cols-2");
    expect(grid?.className).not.toMatch(/(^| )grid-cols-2/);
    expect(image.closest("[data-columns]")).toBe(grid);
  });
});
