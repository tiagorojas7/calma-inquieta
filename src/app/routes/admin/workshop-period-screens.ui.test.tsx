import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminWorkshopPeriodDetail from "./workshop-period-detail";
import AdminWorkshopPeriods from "./workshop-periods";

function stub({
  rows = [
    {
      id: "p1",
      period: "2026-10",
      href: "/admin/talleres/w1/periodos/2026-10",
      status: "open",
      fee: "40000",
      totalCapacity: 14,
    },
  ],
  actionData,
}: {
  rows?: {
    id: string;
    period: string;
    href: string;
    status: "open";
    fee: string;
    totalCapacity: number;
  }[];
  actionData?: {
    values: { period: string };
    errors: { period?: string };
    formError: string;
  };
} = {}) {
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
            suggestedNext: "2026-11",
          },
        },
        ...(actionData ? { actionData: { periods: actionData } } : {}),
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
    expect(screen.getByRole("heading", { name: "Abrir mes" })).toBeVisible();
    expect(screen.getByLabelText("Mes")).toHaveValue("2026-11");
    expect(screen.getByRole("button", { name: "Abrir mes" })).toBeVisible();
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
    await expectNoAxeViolations(container);
  });

  it("shows an accessible empty state", async () => {
    const { container } = render(stub({ rows: [] }));
    expect(await screen.findByText("Todavía no hay períodos")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("preserves the rejected submitted month and explains the conflict", async () => {
    render(
      stub({
        actionData: {
          values: { period: "2026-13" },
          errors: { period: "Ya existe un período para ese mes." },
          formError: "Revisá el mes para abrir el período.",
        },
      }),
    );
    expect(await screen.findByLabelText("Mes")).toHaveValue("2026-13");
    expect(
      screen.getByText("Ya existe un período para ese mes."),
    ).toBeVisible();
    expect(
      screen.getByText("Revisá el mes para abrir el período."),
    ).toBeVisible();
  });
});

function detailStub() {
  const Stub = createRoutesStub([
    {
      path: "/admin/talleres/:id/periodos/:period",
      Component: AdminWorkshopPeriodDetail,
      id: "period-detail",
    },
  ]);
  return (
    <Stub
      initialEntries={["/admin/talleres/w1/periodos/2026-11"]}
      hydrationData={{
        loaderData: {
          "period-detail": {
            period: "2026-11",
            status: "draft",
            values: {
              fee: "40000",
              materialsRequired: true,
              projectTitle: "Tazas",
              projectDescription: "Esmaltes",
              capacities: [{ turnoId: "t1", label: "Mañana", capacity: "8" }],
            },
            images: [{ alt: "Taza terminada" }],
            materials: [{ name: "Arcilla", active: false, available: false }],
            snapshot: {
              teacherName: "Cami",
              modality: "third_party",
              percentage: "35",
            },
            audit: {
              updatedBy: "admin@example.test",
              updatedAt: "5 oct 2026, 09:00",
            },
          },
        },
      }}
    />
  );
}

describe("workshop period detail admin screen", () => {
  it("renders an accessible read-only historical summary without a form", async () => {
    const { container } = render(detailStub());
    expect(
      await screen.findByRole("heading", { name: "Período 2026-11" }),
    ).toBeVisible();
    expect(screen.getByText("40000")).toBeVisible();
    expect(screen.getByText("Tazas")).toBeVisible();
    expect(screen.getByText("Esmaltes")).toBeVisible();
    expect(screen.getByText("Mañana: 8")).toBeVisible();
    expect(screen.getByText("Arcilla (inactivo, no disponible)")).toBeVisible();
    expect(screen.getByText("Taza terminada")).toBeVisible();
    expect(screen.getByText("Docente al abrir:")).toBeVisible();
    expect(screen.getByText("Cami")).toBeVisible();
    expect(screen.getByText("Modalidad al abrir:")).toBeVisible();
    expect(screen.getByText("De terceros")).toBeVisible();
    expect(container.querySelector("form")).toBeNull();
    await expectNoAxeViolations(container);
  });
});
