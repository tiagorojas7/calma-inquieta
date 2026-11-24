import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { MakeUpsList, type MakeUpRow } from "./make-ups-list";

const missedText = {
  title: "No vinieron",
  action: "No vino",
  actionPrefix: "Marcar que no vino a la recuperación",
  marked: "Marcada como no vino.",
  closed: "Esa recuperación ya estaba cerrada.",
};

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
  it("lists what is left to take, with one native post button to mark each as done", async () => {
    const { container } = render(
      <MakeUpsList missedText={missedText} pending={[row()]} done={[]} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Recuperaciones" }),
    ).toBeVisible();
    const pending = screen.getByRole("list", { name: "Por tomar" });
    expect(
      within(pending).getByRole("link", { name: "Ana Pérez" }),
    ).toHaveAttribute("href", "/admin/alumnas/ana%40example.com");
    const form = within(pending).getByRole("form", {
      name: "Ya vino: Ana Pérez",
    });
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector("input[name=intent]")).toHaveValue("complete");
    expect(form.querySelector("input[name=id]")).toHaveValue("m1");
    expect(within(form).getByRole("button", { name: "Ya vino" })).toBeVisible();
    expect(
      screen.getByText("Todavía no hay recuperaciones hechas."),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("returns to the same make-up after a post, and has a way back and no breadcrumbs", () => {
    render(<MakeUpsList missedText={missedText} pending={[row()]} done={[]} />);

    const card = within(
      screen.getByRole("list", { name: "Por tomar" }),
    ).getByRole("listitem");
    expect(card).toHaveAttribute("id", "recuperacion-m1");
    for (const form of within(card).getAllByRole("form")) {
      expect(form.querySelector("input[name=returnTo]")).toHaveValue(
        "/admin/asistencia/recuperaciones",
      );
      expect(form.querySelector("input[name=anchor]")).toHaveValue(
        "recuperacion-m1",
      );
    }
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute(
      "href",
      "/admin/asistencia",
    );
    expect(
      screen.queryByRole("navigation", { name: "Migas de pan" }),
    ).toBeNull();
    expect(within(card).getByText("Faltó")).toBeVisible();
    expect(within(card).getByText("Recupera")).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("says what was saved in a few words", () => {
    render(
      <MakeUpsList missedText={missedText} pending={[]} done={[]} completed />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardado: recuperación hecha",
    );
  });

  it("lists done make-ups with who completed them and no action", () => {
    render(
      <MakeUpsList
        missedText={missedText}
        pending={[]}
        done={[row({ doneNote: "Realizada el 15/10/2026 12:00 (owner)" })]}
      />,
    );

    const done = screen.getByRole("list", { name: "Hechas" });
    expect(
      within(done).getByText("Realizada el 15/10/2026 12:00 (owner)"),
    ).toBeVisible();
    expect(within(done).queryByRole("button")).toBeNull();
    expect(screen.getByText("No hay recuperaciones por tomar.")).toBeVisible();
  });

  it("offers a native post button to mark a pending make-up as missed", () => {
    render(<MakeUpsList missedText={missedText} pending={[row()]} done={[]} />);

    const pending = screen.getByRole("list", { name: "Por tomar" });
    const form = within(pending).getByRole("form", {
      name: "Marcar que no vino a la recuperación: Ana Pérez",
    });
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector("input[name=intent]")).toHaveValue("missed");
    expect(form.querySelector("input[name=id]")).toHaveValue("m1");
    expect(within(form).getByRole("button", { name: "No vino" })).toBeVisible();
  });

  it("lists missed make-ups with who marked them and no action", async () => {
    const { container } = render(
      <MakeUpsList
        missedText={missedText}
        pending={[]}
        done={[]}
        missed={[
          row({ doneNote: "No vino. Lo marcó owner el 15/10/2026 12:00" }),
        ]}
      />,
    );

    const missed = screen.getByRole("list", { name: "No vinieron" });
    expect(
      within(missed).getByText("No vino. Lo marcó owner el 15/10/2026 12:00"),
    ).toBeVisible();
    expect(within(missed).queryByRole("button")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("confirms a missed make-up and says when it was already closed", () => {
    const { rerender } = render(
      <MakeUpsList
        missedText={missedText}
        pending={[]}
        done={[]}
        notice="missed"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardado: marcada como no vino",
    );

    rerender(
      <MakeUpsList
        missedText={missedText}
        pending={[]}
        done={[]}
        notice="closed"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Esa recuperación ya estaba cerrada.",
    );
  });
});
