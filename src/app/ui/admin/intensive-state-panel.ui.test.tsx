import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensiveStatePanel } from "./intensive-state-panel";

const schedule = {
  eventDate: "2026-10-10",
  startsAt: "10:00",
  endsAt: "13:00",
};

function renderPanel(
  status: "draft" | "published" | "paused" | "cancelled" | "archived",
) {
  return render(
    <IntensiveStatePanel
      status={status}
      schedule={schedule}
      error={undefined}
    />,
  );
}

function intent(button: HTMLElement) {
  return button.closest("form")?.querySelector("input[name=intent]");
}

describe("IntensiveStatePanel", () => {
  it.each([
    ["draft", ["Publicar", "Archivar", "Eliminar borrador"]],
    ["published", ["Pausar", "Cancelar intensivo", "Archivar"]],
    ["paused", ["Volver a publicar", "Cancelar intensivo", "Archivar"]],
    ["cancelled", ["Archivar"]],
    ["archived", ["Restaurar como borrador"]],
  ] as const)(
    "shows only the allowed lifecycle actions for %s",
    (status, actions) => {
      renderPanel(status);
      expect(screen.getByText("Estado")).toBeVisible();
      for (const action of actions)
        expect(screen.getByRole("button", { name: action })).toBeVisible();
      for (const action of [
        "Publicar",
        "Volver a publicar",
        "Pausar",
        "Cancelar intensivo",
        "Archivar",
        "Restaurar como borrador",
        "Eliminar borrador",
      ])
        if (!actions.includes(action as never))
          expect(screen.queryByRole("button", { name: action })).toBeNull();
    },
  );

  it("uses native document forms for direct lifecycle actions and rescheduling", () => {
    renderPanel("draft");
    const publish = screen.getByRole("button", { name: "Publicar" });
    expect(publish.closest("form")).toHaveAttribute("method", "post");
    expect(intent(publish)).toHaveValue("publish");
    const reschedule = screen.getByRole("button", { name: "Reprogramar" });
    const form = reschedule.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(intent(reschedule)).toHaveValue("reschedule");
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-10-10");
    expect(screen.getByLabelText("Desde")).toHaveValue("10:00");
    expect(screen.getByLabelText("Hasta")).toHaveValue("13:00");
  });

  it.each([
    ["published", "Pausar", "¿Pausar el intensivo?"],
    ["published", "Cancelar intensivo", "¿Cancelar el intensivo?"],
    ["published", "Archivar", "¿Archivar el intensivo?"],
    ["draft", "Eliminar borrador", "¿Eliminar el borrador?"],
  ] as const)(
    "confirms %s before %s posts, and cancellation does not post",
    async (status, label, title) => {
      renderPanel(status);
      const button = screen.getByRole("button", { name: label });
      const form = button.closest("form") as HTMLFormElement;
      let submissions = 0;
      form.addEventListener("submit", (event) => {
        submissions += 1;
        event.preventDefault();
      });
      await userEvent.click(button);
      expect(screen.getByRole("dialog", { name: title })).toBeVisible();
      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(submissions).toBe(0);
      await userEvent.click(button);
      const confirms = screen.getAllByRole("button", { name: label });
      await userEvent.click(confirms[confirms.length - 1] as HTMLElement);
      expect(submissions).toBe(1);
    },
  );

  it("has accessible lifecycle and reschedule controls", async () => {
    const { container } = renderPanel("published");
    await expectNoAxeViolations(container);
  });
});
