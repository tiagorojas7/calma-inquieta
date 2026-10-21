import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminTeacherDetail from "./teacher-detail";
import AdminTeacherNew from "./teacher-new";
import AdminTeachers from "./teachers";

describe("teacher admin screens", () => {
  it("list screen renders the loaded rows and the filter links", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/profesores",
        Component: AdminTeachers,
        loader: () => ({
          filter: "activos",
          rows: [
            { id: "t1", name: "Ana Gómez", modality: "own", active: true },
          ],
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/profesores"]} />,
    );
    expect(
      await screen.findByRole("link", { name: "Ana Gómez" }),
    ).toHaveAttribute("href", "/admin/profesores/t1");
    expect(screen.getByRole("link", { name: "Activos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expectNoAxeViolations(container);
  });

  it("list screen shows the empty state when there are no teachers", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/profesores",
        Component: AdminTeachers,
        loader: () => ({ filter: "activos", rows: [] }),
      },
    ]);
    render(<Stub initialEntries={["/admin/profesores"]} />);
    expect(
      await screen.findByRole("heading", { name: "Todavía no hay profesores" }),
    ).toBeVisible();
  });

  it("create screen shows an empty form, then the server errors with the typed values", async () => {
    const Stub = createRoutesStub([
      {
        id: "new",
        path: "/admin/profesores/nuevo",
        Component: AdminTeacherNew,
        action: () => null,
        loader: () => null,
      },
    ]);
    const { unmount } = render(
      <Stub initialEntries={["/admin/profesores/nuevo"]} />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue("");
    unmount();

    const Rejected = createRoutesStub([
      {
        id: "new",
        path: "/admin/profesores/nuevo",
        Component: AdminTeacherNew,
        action: () => null,
        loader: () => null,
      },
    ]);
    const { container } = render(
      <Rejected
        initialEntries={["/admin/profesores/nuevo"]}
        hydrationData={{
          loaderData: { new: null },
          actionData: {
            new: {
              values: {
                name: "Lucía",
                bioLine: "",
                phone: "",
                email: "",
                modality: "own",
              },
              errors: { bioLine: "Completá este campo." },
              formError: "Revisá los campos marcados e intentá de nuevo.",
            },
          },
        }}
      />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue("Lucía");
    expect(
      screen.getByLabelText("Presentación breve"),
    ).toHaveAccessibleDescription(/Completá este campo\./);
    expect(
      screen.getByText("Revisá los campos marcados e intentá de nuevo."),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("edit screen loads the teacher into the form with the archive control", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/profesores/:id",
        Component: AdminTeacherDetail,
        action: () => null,
        loader: () => ({
          id: "t1",
          active: true,
          values: {
            name: "Ana Gómez",
            bioLine: "Cerámica",
            phone: "351 555",
            email: "",
            modality: "third_party",
          },
          assignedTo: [],
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/profesores/t1"]} />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue("Ana Gómez");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("351 555");
    expect(screen.getByLabelText("Modalidad")).toHaveValue("third_party");
    expect(screen.getByRole("button", { name: "Archivar" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("edit screen of an archived teacher warns and offers to reactivate", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/profesores/:id",
        Component: AdminTeacherDetail,
        action: () => null,
        loader: () => ({
          id: "t1",
          active: false,
          values: {
            name: "Ana Gómez",
            bioLine: "Cerámica",
            phone: "",
            email: "",
            modality: "own",
          },
          assignedTo: ["Cerámica inicial"],
        }),
      },
    ]);
    render(<Stub initialEntries={["/admin/profesores/t1"]} />);
    expect(
      await screen.findByRole("button", { name: "Reactivar" }),
    ).toBeVisible();
    expect(screen.getByText(/Cerámica inicial/)).toBeVisible();
  });
});
