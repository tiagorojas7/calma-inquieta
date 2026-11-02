import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ConfirmDialog } from "./confirm-dialog";

function setup(props: { open?: boolean; tone?: "destructive" } = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const element = (open: boolean) => (
    <ConfirmDialog
      open={open}
      title="¿Archivar el taller?"
      message="Dejará de verse en el sitio."
      confirmLabel="Archivar"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...(props.tone ? { tone: props.tone } : {})}
    />
  );
  const view = render(element(props.open ?? true));
  return { ...view, element, onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("is not exposed while closed and axe clean", async () => {
    const { container } = setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("opens as a dialog named by its title, with nothing confirmed yet", async () => {
    const { container, onConfirm, onCancel } = setup();
    const dialog = screen.getByRole("dialog", { name: "¿Archivar el taller?" });
    expect(
      within(dialog).getByText("Dejará de verse en el sitio."),
    ).toBeVisible();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    await expectNoAxeViolations(container);
  });

  it("confirms only when the confirm button is pressed", async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Archivar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels with the Cancelar button and with Escape", async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    const escape = new Event("cancel", { cancelable: true });
    fireEvent(screen.getByRole("dialog"), escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes when the parent sets open to false", () => {
    const { rerender, element } = setup();
    rerender(element(false));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirms a destructive action with the red button", () => {
    setup({ tone: "destructive" });
    expect(screen.getByRole("button", { name: "Archivar" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("puts focus on Cancelar for a destructive action", () => {
    setup({ tone: "destructive" });
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });
});
