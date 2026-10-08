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
    expect(screen.getByRole("button")).toHaveClass(
      "bg-clay-600",
      "text-white",
      "focus-visible:outline-clay-800",
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalled();
    await expectNoAxeViolations(container);
  });
  it.each([
    ["primary", ["bg-clay-600", "text-white"]],
    ["outline", ["border-clay-600", "text-clay-600"]],
    ["text-arrow", ["text-clay-800"]],
  ] as const)("supports %s with token roles", (variant, classes) => {
    render(<Button variant={variant}>Acción</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant);
    expect(screen.getByRole("button")).toHaveClass(...classes);
  });
  it("links internally through the router and externally in a new tab", () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => <ButtonLink href="/contacto">Contacto</ButtonLink>,
      },
    ]);
    const { rerender } = render(<Stub initialEntries={["/"]} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/contacto");
    expect(screen.getByRole("link")).not.toHaveAttribute("rel");
    rerender(<ButtonLink href="https://example.com">Sitio</ButtonLink>);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://example.com",
    );
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
