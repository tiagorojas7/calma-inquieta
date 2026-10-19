import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Button, ButtonLink } from "./button";

/** jsdom has no View Transitions API: a stub that applies the update at once. */
function stubViewTransition() {
  const start = vi.fn((update?: () => unknown) => {
    void update?.();
    return {
      finished: Promise.resolve(),
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
      skipTransition: vi.fn(),
    };
  });
  Object.defineProperty(document, "startViewTransition", {
    value: start,
    configurable: true,
    writable: true,
  });
  return start;
}

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
});

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
    ["outline", ["border-clay-600", "text-clay-800"]],
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
  it("renders outline ButtonLink as an anchor without a nested button", () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <ButtonLink href="/talleres" variant="outline">
            Talleres
          </ButtonLink>
        ),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);
    expect(screen.getByRole("link", { name: "Talleres" })).toHaveAttribute(
      "href",
      "/talleres",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([["primary"], ["outline"]] as const)(
    "%s eases color, lift and shadow and keeps the focus ring",
    (variant) => {
      render(<Button variant={variant}>Acción</Button>);

      expect(screen.getByRole("button")).toHaveClass(
        "transition-[color,background-color,border-color,box-shadow,transform]",
        "duration-200",
        "ease-calm",
        "motion-safe:hover:-translate-y-0.5",
        "focus-visible:outline-clay-800",
      );
    },
  );

  it("nudges the arrow link on hover instead of lifting it", () => {
    render(<Button variant="text-arrow">Ver más</Button>);

    expect(screen.getByRole("button")).toHaveClass(
      "link-underline",
      "motion-safe:hover:translate-x-0.5",
      "focus-visible:outline-clay-800",
    );
  });

  it("navigates internal links with a view transition", async () => {
    const start = stubViewTransition();
    const user = userEvent.setup();
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => <ButtonLink href="/contacto">Contacto</ButtonLink>,
      },
      { path: "/contacto", Component: () => <p>Página de contacto</p> },
    ]);
    render(<Stub initialEntries={["/"]} />);

    await user.click(screen.getByRole("link", { name: "Contacto" }));

    expect(await screen.findByText("Página de contacto")).toBeInTheDocument();
    expect(start).toHaveBeenCalled();
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
