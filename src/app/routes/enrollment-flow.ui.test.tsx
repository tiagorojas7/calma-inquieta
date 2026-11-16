import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import EnrollmentRoute from "./enrollment";

const offer = {
  workshopName: "Cerámica",
  period: "2026-11",
  periodLabel: "noviembre 2026",
  fee: "$ 58.000",
  turnos: [{ id: "turno-1", label: "Martes" }],
};

const values = {
  fullName: "Ana Pérez",
  email: "ana@example.com",
  phone: "351 555 0101",
  turnoId: "turno-1",
};

function renderEnrollment(actionData?: unknown) {
  const Stub = createRoutesStub([
    {
      id: "enrollment",
      path: "/talleres/:slug/inscripcion",
      Component: EnrollmentRoute as never,
    },
    {
      path: "/talleres/:slug/inscripcion/materiales",
      Component: () => <p>Pantalla de materiales</p>,
    },
  ]);
  return render(
    <Stub
      initialEntries={["/talleres/ceramica/inscripcion?period=2026-11"]}
      hydrationData={{
        loaderData: { enrollment: { offer } },
        ...(actionData ? { actionData: { enrollment: actionData } } : {}),
      }}
    />,
  );
}

describe("enrollment flow", () => {
  it("stays on the form with two steps and never goes to a materials step", async () => {
    renderEnrollment({ values, errors: {}, needsMaterials: true });

    expect(await screen.findByLabelText("Nombre completo")).toHaveValue(
      "Ana Pérez",
    );
    expect(screen.getByText("Paso 1 de 2")).toBeVisible();
    expect(screen.queryByText("Pantalla de materiales")).toBeNull();
    expect(screen.queryByText("Materiales requeridos")).toBeNull();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeVisible();
  });

  it("keeps what a failed submit sent", async () => {
    renderEnrollment({
      values: { ...values, fullName: "Otra Persona" },
      errors: { email: "Ingresá un email válido." },
    });

    expect(await screen.findByLabelText("Nombre completo")).toHaveValue(
      "Otra Persona",
    );
  });
});
