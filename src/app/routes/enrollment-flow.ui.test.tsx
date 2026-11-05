import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadEnrollmentDraft,
  saveEnrollmentDraft,
} from "~/app/enrollment/enrollment-draft";
import EnrollmentRoute from "./enrollment";

const offer = {
  workshopName: "Cerámica",
  period: "2026-11",
  periodLabel: "noviembre 2026",
  fee: "$ 58.000",
  materialsRequired: true,
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

afterEach(() => {
  window.sessionStorage.clear();
});

describe("enrollment flow", () => {
  it("goes straight to the materials once the details are valid, keeping them", async () => {
    renderEnrollment({ values, errors: {}, needsMaterials: true });

    expect(await screen.findByText("Pantalla de materiales")).toBeVisible();
    expect(
      loadEnrollmentDraft(window.sessionStorage, "ceramica")?.student,
    ).toMatchObject({ ...values, period: "2026-11", policyAccepted: true });
  });

  it("keeps the materials already chosen when the details are sent again", async () => {
    const lines = [{ materialId: "arcilla", variantId: "kilo", quantity: 2 }];
    saveEnrollmentDraft(window.sessionStorage, "ceramica", {
      student: { ...values, period: "2026-11", policyAccepted: true },
      lines,
    });

    renderEnrollment({ values, errors: {}, needsMaterials: true });

    await screen.findByText("Pantalla de materiales");
    expect(
      loadEnrollmentDraft(window.sessionStorage, "ceramica")?.lines,
    ).toEqual(lines);
  });

  it("brings back the details when the student returns from the materials", async () => {
    saveEnrollmentDraft(window.sessionStorage, "ceramica", {
      student: { ...values, period: "2026-11", policyAccepted: true },
      lines: [],
    });

    renderEnrollment();

    expect(await screen.findByDisplayValue("Ana Pérez")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Teléfono argentino")).toHaveValue(
      "351 555 0101",
    );
    expect(screen.getByLabelText("Turno")).toHaveValue("turno-1");
  });

  it("ignores details saved for another month", async () => {
    saveEnrollmentDraft(window.sessionStorage, "ceramica", {
      student: { ...values, period: "2026-12", policyAccepted: true },
      lines: [],
    });

    renderEnrollment();

    expect(await screen.findByLabelText("Nombre completo")).toHaveValue("");
  });

  it("keeps what a failed submit sent over the saved details", async () => {
    saveEnrollmentDraft(window.sessionStorage, "ceramica", {
      student: { ...values, period: "2026-11", policyAccepted: true },
      lines: [],
    });

    renderEnrollment({
      values: { ...values, fullName: "Otra Persona" },
      errors: { email: "Ingresá un email válido." },
    });

    expect(await screen.findByLabelText("Nombre completo")).toHaveValue(
      "Otra Persona",
    );
  });
});
