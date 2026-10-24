import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminWorkshopPeriods from "./workshop-periods";

function stub(
  rows = [
    {
      id: "p1",
      period: "2026-10",
      status: "open",
      fee: "40000",
      totalCapacity: 14,
    },
  ],
) {
  const Stub = createRoutesStub([
    {
      path: "/admin/talleres/:id/periodos",
      Component: AdminWorkshopPeriods,
      id: "periods",
    },
  ]);
  return (
    <Stub
      initialEntries={["/admin/talleres/w1/periodos"]}
      hydrationData={{
        loaderData: {
          periods: {
            workshopId: "w1",
            workshopName: "Cerámica Creativa",
            periods: rows,
          },
        },
      }}
    />
  );
}

describe("workshop periods admin screen", () => {
  it("lists periods in a contained table with accessible scrolling", async () => {
    const { container } = render(stub());
    const table = await screen.findByRole("table", {
      name: "Períodos del taller",
    });
    expect(within(table).getByText("2026-10")).toBeVisible();
    expect(within(table).getByText("Abierto")).toBeVisible();
    expect(within(table).getByText("40000")).toBeVisible();
    expect(within(table).getByText("14")).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Períodos del taller" }),
    ).toHaveClass("overflow-x-auto");
    expect(
      screen.getByRole("link", { name: "Volver al taller" }),
    ).toHaveAttribute("href", "/admin/talleres/w1");
    expect(
      screen.queryByRole("heading", { name: "Abrir mes" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("shows an accessible empty state", async () => {
    const { container } = render(stub([]));
    expect(await screen.findByText("Todavía no hay períodos")).toBeVisible();
    await expectNoAxeViolations(container);
  });
});
