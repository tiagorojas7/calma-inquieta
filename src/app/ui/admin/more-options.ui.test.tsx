import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { MoreOptions } from "./more-options";

describe("MoreOptions", () => {
  it("is closed by default and says Más opciones", async () => {
    const { container } = render(
      <MoreOptions>
        <label>
          Costo
          <input name="cost" />
        </label>
      </MoreOptions>,
    );
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(screen.getByText("Más opciones")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("opens with a click and shows what is inside", async () => {
    const { container } = render(
      <MoreOptions>
        <p>Detalle</p>
      </MoreOptions>,
    );
    await userEvent.click(screen.getByText("Más opciones"));
    expect(
      (container.querySelector("details") as HTMLDetailsElement).open,
    ).toBe(true);
    expect(screen.getByText("Detalle")).toBeVisible();
  });

  it("keeps its fields in the form even while closed", () => {
    const { container } = render(
      <form>
        <MoreOptions>
          <input name="cost" defaultValue="12" />
        </MoreOptions>
      </form>,
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).get("cost")).toBe("12");
  });

  it("can take another label and can start open", () => {
    const { container } = render(
      <MoreOptions label="Ver más" defaultOpen>
        <p>Detalle</p>
      </MoreOptions>,
    );
    expect(screen.getByText("Ver más")).toBeVisible();
    expect(
      (container.querySelector("details") as HTMLDetailsElement).open,
    ).toBe(true);
  });

  it("makes the summary a 48 px target", () => {
    render(
      <MoreOptions>
        <p>x</p>
      </MoreOptions>,
    );
    expect(screen.getByText("Más opciones").closest("summary")).toHaveClass(
      "min-h-12",
    );
  });
});
