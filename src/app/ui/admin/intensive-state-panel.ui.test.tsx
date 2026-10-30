import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  intensiveHasPrimaryAction,
  IntensiveOtherActions,
  IntensiveStatePanel,
} from "./intensive-state-panel";

const schedule = {
  eventDate: "2026-10-10",
  startsAt: "10:00",
  endsAt: "13:00",
};
type Status = "draft" | "published" | "paused" | "cancelled" | "archived";

function renderBoth(status: Status) {
  return render(
    <>
      <IntensiveStatePanel status={status} error={undefined} />
      <IntensiveOtherActions status={status} schedule={schedule} />
    </>,
  );
}

function intent(button: HTMLElement) {
  return button.closest("form")?.querySelector("input[name=intent]");
}

const ALL = [
  "Publicar",
  "Volver a publicar",
  "Pausar",
  "Cancelar intensivo",
  "Archivar",
  "Restaurar como borrador",
  "Eliminar borrador",
];

describe("IntensiveStatePanel", () => {
  it.each([
    ["draft", "Publicar", "Borrador. Todavía no se ve en el sitio."],
    ["paused", "Volver a publicar", "Pausado. No recibe solicitudes nuevas."],
    ["archived", "Restaurar como borrador", "Archivado. No se ve en el sitio."],
  ] as const)("shows one primary action for %s: %s", (status, label, line) => {
    renderBoth(status);
    expect(screen.getByText("Estado")).toBeVisible();
    expect(screen.getByText(line)).toBeVisible();
    const primary = screen.getByRole("button", { name: label });
    expect(primary).toBeVisible();
    expect(primary.closest("details")).toBeNull();
    expect(intensiveHasPrimaryAction(status)).toBe(true);
  });

  it.each([
    ["published", "Publicado. Recibe solicitudes."],
    ["cancelled", "Cancelado. No recibe solicitudes."],
  ] as const)("shows only the status line for %s", (status, line) => {
    const { container } = render(
      <IntensiveStatePanel status={status} error={undefined} />,
    );
    expect(screen.getByText(line)).toBeVisible();
    expect(container.querySelector("button")).toBeNull();
    expect(intensiveHasPrimaryAction(status)).toBe(false);
  });

  it("uses a native document form for the primary action", () => {
    renderBoth("draft");
    const publish = screen.getByRole("button", { name: "Publicar" });
    expect(publish.closest("form")).toHaveAttribute("method", "post");
    expect(intent(publish)).toHaveValue("publish");
  });

  it("shows the state error", () => {
    render(<IntensiveStatePanel status="draft" error="Falta algo" />);
    expect(screen.getByText("Falta algo")).toBeVisible();
  });
});

describe("IntensiveOtherActions", () => {
  it.each([
    ["draft", ["Archivar", "Eliminar borrador"]],
    ["published", ["Pausar", "Cancelar intensivo", "Archivar"]],
    ["paused", ["Cancelar intensivo", "Archivar"]],
    ["cancelled", ["Archivar"]],
    ["archived", []],
  ] as const)(
    "groups only the allowed secondary actions for %s in a closed block",
    async (status, actions) => {
      const { container } = render(
        <IntensiveOtherActions status={status} schedule={schedule} />,
      );
      const block = container.querySelector("details") as HTMLElement;
      expect(block).not.toHaveAttribute("open");
      await userEvent.click(screen.getByText("Otras acciones"));
      for (const action of actions)
        expect(
          within(block).getByRole("button", { name: action }),
        ).toBeVisible();
      for (const action of ALL)
        if (!actions.includes(action as never))
          expect(screen.queryByRole("button", { name: action })).toBeNull();
    },
  );

  it("keeps cancel, archive and delete in the danger zone", async () => {
    renderBoth("draft");
    await userEvent.click(screen.getByText("Otras acciones"));
    const zone = screen.getByRole("region", {
      name: "Cancelar, archivar o eliminar",
    });
    expect(
      within(zone).getByRole("button", { name: "Eliminar borrador" }),
    ).toBeVisible();
  });

  it("offers a native reschedule form", async () => {
    renderBoth("draft");
    await userEvent.click(screen.getByText("Otras acciones"));
    const reschedule = screen.getByRole("button", { name: "Reprogramar" });
    expect(reschedule.closest("form")).toHaveAttribute("method", "post");
    expect(intent(reschedule)).toHaveValue("reschedule");
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-10-10");
    expect(screen.getByLabelText("Desde")).toHaveValue("10:00");
    expect(screen.getByLabelText("Hasta")).toHaveValue("13:00");
  });

  it("opens by itself to show a rescheduling error", () => {
    const { container } = render(
      <IntensiveOtherActions
        status="published"
        schedule={schedule}
        reschedule={{
          values: schedule,
          errors: { eventDate: "Elegí una fecha" },
        }}
      />,
    );
    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(screen.getByText("Elegí una fecha")).toBeVisible();
  });

  it.each([
    ["published", "Pausar", "¿Pausar el intensivo?"],
    ["published", "Cancelar intensivo", "¿Cancelar el intensivo?"],
    ["published", "Archivar", "¿Archivar el intensivo?"],
    ["draft", "Eliminar borrador", "¿Eliminar el borrador?"],
  ] as const)(
    "confirms %s before %s posts, and cancellation does not post",
    async (status, label, title) => {
      render(<IntensiveOtherActions status={status} schedule={schedule} />);
      await userEvent.click(screen.getByText("Otras acciones"));
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

  it("has accessible controls", async () => {
    const { container } = renderBoth("published");
    await userEvent.click(screen.getByText("Otras acciones"));
    await expectNoAxeViolations(container);
  });
});
