import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { TeacherSettlementPanel } from "./teacher-settlement";

const responsible = {
  period: "2026-10",
  periodLabel: "octubre 2026",
  responsible: true,
  modality: "De terceros",
  percentage: "30 %",
  activities: "Cerámica, Torno",
  students: "2",
  income: "$ 30.000",
  estimate: "$ 9.000",
} as const;

const valueOf = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling;

describe("TeacherSettlementPanel", () => {
  it("shows the month filter as a GET form and the figures of the month", async () => {
    const { container } = render(
      <TeacherSettlementPanel teacherId="t1" settlement={responsible} />,
    );

    expect(
      screen.getByRole("heading", { name: "Importe estimado a liquidar" }),
    ).toBeVisible();
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/profesores/t1");
    expect(screen.getByLabelText("Mes")).toHaveValue("2026-10");
    expect(valueOf("Porcentaje acordado")).toHaveTextContent("30 %");
    expect(valueOf("Alumnas vinculadas")).toHaveTextContent("2");
    expect(valueOf("Ingresos asociados")).toHaveTextContent("$ 30.000");
    expect(valueOf("Importe estimado a liquidar")).toHaveTextContent("$ 9.000");
    await expectNoAxeViolations(container);
  });

  it("explains that own teachers have no percentage and no amount", () => {
    render(
      <TeacherSettlementPanel
        teacherId="t2"
        settlement={{
          ...responsible,
          modality: "Propia",
          percentage: "Sin porcentaje",
          estimate: null,
        }}
      />,
    );

    expect(screen.getByText(/no tiene porcentaje acordado/)).toBeVisible();
    expect(valueOf("Importe estimado a liquidar")).toHaveTextContent(
      "Sin porcentaje",
    );
  });

  it("says so when the teacher has nothing in the month", () => {
    render(
      <TeacherSettlementPanel
        teacherId="t1"
        settlement={{
          period: "2026-10",
          periodLabel: "octubre 2026",
          responsible: false,
        }}
      />,
    );

    expect(
      screen.getByText(
        "Este mes no tiene actividades a cargo de este profesor.",
      ),
    ).toBeVisible();
  });
});
