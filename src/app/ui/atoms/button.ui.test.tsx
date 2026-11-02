import { render, screen, within } from "@testing-library/react";
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
    ["secondary", ["border-clay-600", "text-clay-800"]],
    ["tertiary", ["text-clay-800"]],
    ["outline", ["border-clay-600", "text-clay-800"]],
    ["text-arrow", ["text-clay-800"]],
    ["success", ["bg-moss-600", "text-white", "hover:bg-moss-700"]],
    ["danger", ["bg-berry-600", "text-white", "hover:bg-berry-700"]],
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
        "transition-[color,background-color,border-color,box-shadow,transform,opacity]",
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

  it("uses native disabled and busy semantics without changing its target", async () => {
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
    const disabled = screen.getByRole("button", { name: "Deshabilitado" });
    expect(disabled).toBeDisabled();
    expect(disabled).not.toHaveAttribute("aria-busy");
    await user.click(disabled);
    expect(onClick).toHaveBeenCalledTimes(2);
    render(
      <Button loading onClick={onClick}>
        Guardando
      </Button>,
    );
    const busy = screen.getByRole("button", { name: "Guardando" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveClass("min-h-11", "px-7", "py-3");
    await user.click(busy);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "Button",
      "button",
      "Guardar",
      (loading: boolean) => <Button loading={loading}>Guardar</Button>,
    ],
    [
      "ButtonLink",
      "link",
      "Guardar(se abre en una pestaña nueva)",
      (loading: boolean) => (
        <ButtonLink href="https://example.com" loading={loading}>
          Guardar
        </ButtonLink>
      ),
    ],
  ] as const)(
    "shows an out-of-flow progress indicator only while %s is loading",
    (_control, role, accessibleName, renderControl) => {
      const { rerender } = render(renderControl(false));
      const control = screen.getByRole(role, { name: accessibleName });
      const idleClasses = control.className;

      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
      expect(within(control).getByText("Guardar")).not.toHaveClass("opacity-0");

      rerender(renderControl(true));

      const busyControl = screen.getByRole(role, { name: accessibleName });
      expect(busyControl).toHaveClass(...idleClasses.split(" "));
      expect(within(busyControl).getByText("Guardar")).toHaveClass("opacity-0");
      expect(screen.getByTestId("loading-indicator")).toHaveClass(
        "absolute",
        "motion-reduce:animate-none",
      );
      expect(screen.getByText("Guardar")).toHaveClass("opacity-0");
      expect(
        screen.getByRole(role, { name: accessibleName }),
      ).toHaveAccessibleName(accessibleName);

      rerender(renderControl(false));

      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();
    },
  );

  it("marks disabled or busy links unavailable and prevents their activation", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <ButtonLink href="/contacto" loading onClick={onClick}>
            Contacto
          </ButtonLink>
        ),
      },
      { path: "/contacto", Component: () => <p>Página de contacto</p> },
    ]);
    render(<Stub initialEntries={["/"]} />);

    const link = screen.getByRole("link", { name: "Contacto" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("aria-busy", "true");
    expect(link).toHaveClass("min-h-11", "px-7", "py-3");
    await user.click(link);
    await user.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.queryByText("Página de contacto")).not.toBeInTheDocument();
  });
});

describe("Button identity treatment", () => {
  const renderLink = (variant: "primary" | "secondary" | "tertiary") => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <ButtonLink href="/talleres" variant={variant}>
            Ver talleres
          </ButtonLink>
        ),
      },
    ]);
    render(<Stub />);
    return screen.getByRole("link", { name: "Ver talleres" });
  };

  it("draws the arrow on primary links", () => {
    expect(renderLink("primary")).toHaveClass("btn-arrow", "rounded-pill");
  });

  it("gives the primary fill the layered button shadow", () => {
    expect(renderLink("primary")).toHaveClass("shadow-button");
  });
});

describe("Button identity treatment (secondary and tertiary)", () => {
  it("keeps the arrow off text links", () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <ButtonLink href="/talleres" variant="tertiary">
            Ver talleres
          </ButtonLink>
        ),
      },
    ]);
    render(<Stub />);
    expect(screen.getByRole("link")).not.toHaveClass("btn-arrow");
  });
});
