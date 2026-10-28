import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { MakeUpsList, type MakeUpRow } from "./make-ups-list";

const row = (overrides: Partial<MakeUpRow> = {}): MakeUpRow => ({
  id: "m1",
  student: "Ana Pérez",
  email: "ana@example.com",
  absence: "Cerámica, Lunes tarde · Lunes 05/10/2026",
  makeUp: "Cerámica, Miércoles · Miércoles 14/10/2026",
  doneNote: null,
  ...overrides,
});

describe("MakeUpsList", () => {
  it("lists pending make-ups with a native post form to mark each done", async () => {
    const { container } = render(<MakeUpsList pending={[row()]} done={[]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Recuperaciones" }),
    ).toBeVisible();
    const pending = screen.getByRole("region", { name: "Pendientes" });
    expect(
      within(pending).getByRole("link", { name: "Ana Pérez" }),
    ).toHaveAttribute("href", "/admin/alumnas/ana%40example.com");
    const form = within(pending).getByRole("form", {
      name: "Marcar como realizada la de Ana Pérez",
    });
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector("input[name=intent]")).toHaveValue("complete");
    expect(form.querySelector("input[name=id]")).toHaveValue("m1");
    expect(
      screen.getByText("No hay recuperaciones realizadas.", { exact: false }),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("lists done make-ups with who completed them and no action", () => {
    render(
      <MakeUpsList
        pending={[]}
        done={[row({ doneNote: "Realizada el 15/10/2026 12:00 (owner)" })]}
      />,
    );

    const done = screen.getByRole("region", { name: "Realizadas" });
    expect(
      within(done).getByText("Realizada el 15/10/2026 12:00 (owner)"),
    ).toBeVisible();
    expect(within(done).queryByRole("button")).toBeNull();
    expect(
      screen.getByRole("heading", {
        name: "No hay recuperaciones pendientes.",
      }),
    ).toBeVisible();
  });
});
