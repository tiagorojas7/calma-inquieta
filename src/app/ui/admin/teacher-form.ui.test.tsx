import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  TeacherArchiveZone,
  TeacherForm,
  TeacherStatePanel,
} from "./teacher-form";

const empty = { name: "", bioLine: "", phone: "", email: "", modality: "" };

function renderForm(props: Partial<Parameters<typeof TeacherForm>[0]> = {}) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <TeacherForm
          values={empty}
          errors={{}}
          submitLabel="Guardar"
          cancelHref="/admin/profesores"
          {...props}
        />
      ),
    },
  ]);
  return render(<Stub />);
}

describe("TeacherForm", () => {
  it("shows the five fields, no percentage, and the cancel link", async () => {
    const { container } = renderForm();
    for (const label of [
      "Nombre",
      "Presentación breve",
      "Teléfono",
      "Correo electrónico",
      "Modalidad",
    ]) {
      expect(await screen.findByLabelText(label)).toBeVisible();
    }
    expect(screen.queryByLabelText(/porcentaje/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/profesores",
    );
    await expectNoAxeViolations(container);
  });

  it("keeps the typed values and shows each error next to its field", async () => {
    renderForm({
      values: { ...empty, name: "Lucía", email: "mal", modality: "own" },
      errors: {
        bioLine: "Completá este campo.",
        email: "El formato no es válido. Revisalo.",
      },
      formError: "Revisá los campos marcados e intentá de nuevo.",
    });
    expect(await screen.findByLabelText("Nombre")).toHaveValue("Lucía");
    expect(screen.getByLabelText("Modalidad")).toHaveValue("own");
    expect(
      screen.getByLabelText("Presentación breve"),
    ).toHaveAccessibleDescription(/Completá este campo\./);
    expect(
      screen.getByLabelText("Correo electrónico"),
    ).toHaveAccessibleDescription(/El formato no es válido/);
    expect(
      screen.getByText("Revisá los campos marcados e intentá de nuevo."),
    ).toBeVisible();
  });

  it("submits as a document: a native post form that is never intercepted", async () => {
    // Layer 1 (admin-gate) denies every /admin/**.data request, so a client
    // navigation or fetcher submit would be refused even for an admin.
    renderForm();
    const name = await screen.findByLabelText("Nombre");
    const form = name.closest("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form).toHaveAttribute("novalidate");
    const notPrevented = fireEvent.submit(form as HTMLFormElement);
    expect(notPrevented).toBe(true);
  });
});

describe("TeacherStatePanel", () => {
  it("asks before archiving an active teacher, then posts the archive intent", async () => {
    const Stub = createRoutesStub([
      { path: "/", Component: () => <TeacherArchiveZone error={undefined} /> },
    ]);
    render(<Stub />);
    const zone = await screen.findByRole("region", { name: "Zona de riesgo" });
    const form = within(zone)
      .getByRole("button", { name: "Archivar" })
      .closest("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form?.querySelector("input[name=intent]")).toHaveValue("archive");
    fireEvent.click(within(zone).getByRole("button", { name: "Archivar" }));
    expect(
      await screen.findByRole("dialog", { name: "¿Archivar este profesor?" }),
    ).toBeVisible();
  });

  it("offers Reactivar and warns naming the activities an archived teacher keeps", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <TeacherStatePanel
            assignedTo={["Cerámica inicial", "Intensivo de torno"]}
            error="Ya existe uno activo con el mismo nombre."
          />
        ),
      },
    ]);
    render(<Stub />);
    const button = await screen.findByRole("button", { name: "Reactivar" });
    expect(
      button.closest("form")?.querySelector("input[name=intent]"),
    ).toHaveValue("reactivate");
    expect(screen.getByText("Este profesor está archivado.")).toBeVisible();
    expect(
      screen.getByText(/Cerámica inicial, Intensivo de torno/),
    ).toBeVisible();
    expect(
      screen.getByText("Ya existe uno activo con el mismo nombre."),
    ).toBeVisible();
  });

  it("shows no warning when the archived teacher has no assignments", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <TeacherStatePanel assignedTo={[]} error={undefined} />
        ),
      },
    ]);
    render(<Stub />);
    await screen.findByRole("button", { name: "Reactivar" });
    expect(screen.queryByText(/Sigue asignado/)).toBeNull();
  });
});
