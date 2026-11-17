import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { TeacherWorkshopsPanel } from "./teacher-workshops";

const rows = [
  {
    id: "w1",
    name: "Modelado",
    status: "published" as const,
    percentage: "35,5",
  },
  { id: "w2", name: "Torno", status: "paused" as const, percentage: "" },
];

function stub(element: React.ReactElement) {
  const Stub = createRoutesStub([{ path: "/", Component: () => element }]);
  return render(<Stub />);
}

describe("TeacherWorkshopsPanel", () => {
  it("lists each workshop with a link and a native form that posts its percentage", async () => {
    const { container } = stub(
      <TeacherWorkshopsPanel workshops={rows} percentageApplies />,
    );

    expect(
      screen.getByRole("heading", { name: "Talleres asignados" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Los meses ya abiertos conservan su porcentaje; para cambiarlo, editá ese mes.",
      ),
    ).toBeInTheDocument();
    const form = screen.getByRole("form", { name: "Porcentaje de Modelado" });
    expect(form).toHaveAttribute("method", "post");
    expect(within(form).getByLabelText("Porcentaje acordado")).toHaveValue(
      "35,5",
    );
    expect(form.querySelector("input[name=intent]")).toHaveValue("percentage");
    expect(form.querySelector("input[name=workshopId]")).toHaveValue("w1");
    expect(
      within(form).getByRole("button", { name: "Guardar porcentaje" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: "Modelado" })).toHaveAttribute(
      "href",
      "/admin/talleres/w1",
    );
    expect(screen.getByRole("link", { name: "Torno" })).toHaveAttribute(
      "href",
      "/admin/talleres/w2",
    );
    await expectNoAxeViolations(container);
  });

  it("shows the typed value and the message on the workshop that was refused", () => {
    stub(
      <TeacherWorkshopsPanel
        workshops={rows}
        percentageApplies
        error={{ workshopId: "w2", value: "120", message: "Fuera de rango." }}
      />,
    );

    const refused = screen.getByRole("form", { name: "Porcentaje de Torno" });
    const field = within(refused).getByLabelText("Porcentaje acordado");
    expect(field).toHaveValue("120");
    expect(field).toHaveAccessibleDescription(/Fuera de rango\./);
    const other = screen.getByRole("form", { name: "Porcentaje de Modelado" });
    expect(within(other).getByLabelText("Porcentaje acordado")).toHaveValue(
      "35,5",
    );
  });

  it("offers no percentage for an own teacher and says when she has no workshop", () => {
    const { unmount } = stub(
      <TeacherWorkshopsPanel workshops={rows} percentageApplies={false} />,
    );
    expect(screen.queryByLabelText("Porcentaje acordado")).toBeNull();
    expect(
      screen.getAllByText("Modalidad propia: sin porcentaje acordado."),
    ).toHaveLength(2);
    unmount();

    stub(<TeacherWorkshopsPanel workshops={[]} percentageApplies />);
    expect(
      screen.getByText("No tiene talleres asignados."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Los meses ya abiertos/)).toBeNull();
  });
});
