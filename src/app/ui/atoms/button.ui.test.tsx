import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Button, ButtonLink } from "./button";

describe("Button", () => {
  it("renders variants, disabled state and click behavior", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button variant="primary" onClick={onClick}>
        Guardar
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-variant",
      "primary",
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalled();
    await expectNoAxeViolations(container);
  });
  it.each(["primary", "outline", "text-arrow"] as const)(
    "supports %s",
    (variant) => {
      render(<Button variant={variant}>Acción</Button>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "data-variant",
        variant,
      );
    },
  );
  it("links internally through the router and externally in a new tab", () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => <ButtonLink href="/contacto">Contacto</ButtonLink>,
      },
    ]);
    const { rerender } = render(<Stub initialEntries={["/"]} />);
    expect(screen.getByRole("link")).not.toHaveAttribute("rel");
    rerender(<ButtonLink href="https://example.com">Sitio</ButtonLink>);
    expect(screen.getByRole("link")).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link")).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(
      screen.getByText("(se abre en una pestaña nueva)"),
    ).toBeInTheDocument();
  });
  it("uses native keyboard activation and suppresses disabled buttons", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Acción</Button>);
    screen.getByRole("button", { name: "Acción" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
    render(
      <Button disabled onClick={onClick}>
        Deshabilitado
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Deshabilitado" }));
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
