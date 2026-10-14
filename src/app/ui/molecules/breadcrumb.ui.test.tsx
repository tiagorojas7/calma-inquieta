import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Breadcrumb } from "./breadcrumb";

describe("Breadcrumb", () => {
  it("renders a labelled nav with the last item as the current page", async () => {
    const { container } = render(
      <Breadcrumb
        label="Ruta de navegación"
        items={[
          { label: "Inicio", href: "/" },
          { label: "Talleres", href: "/talleres" },
          { label: "Cerámica" },
        ]}
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Ruta de navegación" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Talleres" })).toHaveAttribute(
      "href",
      "/talleres",
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByText("Cerámica")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Inicio")).not.toHaveAttribute("aria-current");
    await expectNoAxeViolations(container);
  });

  it("marks the last item as current even when it has a link", async () => {
    const { container } = render(
      <Breadcrumb
        label="Ruta"
        items={[
          { label: "Inicio", href: "/" },
          { label: "Intensivos", href: "/intensivos" },
        ]}
      />,
    );
    expect(screen.getByText("Intensivos")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await expectNoAxeViolations(container);
  });
});
