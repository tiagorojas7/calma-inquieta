import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminWorkshopDetail from "./workshop-detail";
import AdminWorkshopNew from "./workshop-new";
import AdminWorkshops from "./workshops";

const TEACHERS = [
  { id: "t1", name: "Ana Gómez", modality: "own" },
  { id: "t2", name: "Beto Ruiz", modality: "third_party" },
];

const VALUES = {
  name: "Cerámica Creativa",
  slug: "ceramica-creativa",
  summary: "Modelado y torno",
  description: "Un taller para empezar de cero.",
  technique: "Cerámica",
  defaultFee: "12000",
  teacherId: "t2",
  percentage: "35,5",
  images: [] as { assetId: string; src: string; alt: string }[],
};

const DETAIL_EXTRA = {
  name: "Cerámica Creativa",
  feedback: null,
  failure: null,
  summary: "Publicado. Falta abrir las inscripciones de octubre.",
  enrollmentOpen: false,
  next: {
    cta: "Abrir inscripciones de octubre",
    href: "/admin/talleres/w1/periodos",
  },
  turnos: [
    { id: "t1", label: "Mañana", when: "Martes 10:00 a 12:00", capacity: 8 },
  ],
  months: [
    {
      period: "2026-09",
      label: "septiembre",
      status: "closed",
      href: "/admin/talleres/w1/periodos/2026-09",
    },
  ],
};

const MATERIALS = [{ id: "m1", name: "Arcilla" }];

const EMPTY_ROWS = Array.from({ length: 5 }, () => ({
  weekday: "",
  startsAt: "",
  endsAt: "",
  capacity: "",
}));

describe("workshop admin screens", () => {
  it("list screen shows each workshop with teacher, status and turnos, and filter links", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres",
        Component: AdminWorkshops,
        loader: () => ({
          filter: "vigentes",
          rows: [
            {
              id: "w1",
              name: "Cerámica Creativa",
              teacherName: "Ana Gómez",
              status: "published",
              activeTurnos: 2,
              enrollment: {
                open: false,
                summary: "Falta abrir octubre",
                cta: null,
                href: null,
              },
              openNext: { period: "2026-10", label: "octubre" },
            },
            {
              id: "w2",
              name: "Bordado",
              teacherName: null,
              status: "draft",
              activeTurnos: 0,
              enrollment: {
                open: false,
                summary: "Falta agregar un turno activo",
                cta: "Agregar un turno",
                href: "/admin/talleres/w2/turnos",
              },
            },
          ],
        }),
      },
    ]);
    const { container } = render(<Stub initialEntries={["/admin/talleres"]} />);
    expect(
      await screen.findByRole("link", { name: "Cerámica Creativa" }),
    ).toHaveAttribute("href", "/admin/talleres/w1");
    expect(screen.getByText("Publicado")).toBeVisible();
    expect(screen.getByText(/Sin profesor/)).toBeVisible();
    expect(screen.getByText("Falta abrir octubre")).toBeVisible();
    const open = screen.getByRole("button", { name: "Abrir octubre" });
    expect(open.closest("form")).toHaveAttribute("method", "post");
    expect(open.closest("form")?.querySelector("[name=period]")).toHaveValue(
      "2026-10",
    );
    expect(
      open.closest("form")?.querySelector("[name=workshopId]"),
    ).toHaveValue("w1");
    expect(screen.queryByRole("button", { name: /Abrir novi/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Vigentes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Archivados" })).toHaveAttribute(
      "href",
      "/admin/talleres?estado=archivados",
    );
    await expectNoAxeViolations(container);
  });

  it("list screen shows the empty state when there are no workshops", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres",
        Component: AdminWorkshops,
        loader: () => ({ filter: "vigentes", rows: [] }),
      },
    ]);
    render(<Stub initialEntries={["/admin/talleres"]} />);
    expect(
      await screen.findByRole("heading", { name: "Todavía no hay talleres" }),
    ).toBeVisible();
  });

  it("create screen shows an empty form, then the server errors with the typed values", async () => {
    const route = {
      id: "new",
      path: "/admin/talleres/nuevo",
      Component: AdminWorkshopNew,
      action: () => null,
      loader: () => ({ teachers: TEACHERS, materials: MATERIALS }),
    };
    const Empty = createRoutesStub([route]);
    const { unmount } = render(
      <Empty initialEntries={["/admin/talleres/nuevo"]} />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Profesor")).toHaveValue("");
    unmount();

    const Rejected = createRoutesStub([route]);
    const { container } = render(
      <Rejected
        initialEntries={["/admin/talleres/nuevo"]}
        hydrationData={{
          loaderData: { new: { teachers: TEACHERS, materials: MATERIALS } },
          actionData: {
            new: {
              values: {
                name: VALUES.name,
                description: VALUES.description,
                teacherId: VALUES.teacherId,
                defaultFee: "12,5",
                percentage: VALUES.percentage,
                images: [],
                rows: EMPTY_ROWS.map((row, index) =>
                  index === 0
                    ? {
                        weekday: "2",
                        startsAt: "10:00",
                        endsAt: "",
                        capacity: "8",
                      }
                    : row,
                ),
                materialIds: ["m1"],
              },
              errors: { defaultFee: "El formato no es válido. Revisalo." },
              turnoErrors: { 0: "Revisá este turno: faltan datos." },
              formError: "Revisá los campos marcados e intentá de nuevo.",
            },
          },
        }}
      />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue(
      "Cerámica Creativa",
    );
    expect(
      screen.getByLabelText(/Arancel mensual/),
    ).toHaveAccessibleDescription(/El formato no es válido/);
    expect(screen.getByLabelText("Profesor")).toHaveValue("t2");
    expect(screen.getByLabelText("Porcentaje acordado")).toHaveValue("35,5");
    expect(screen.getByText("Revisá este turno: faltan datos.")).toBeVisible();
    expect(screen.getByLabelText("Arcilla")).toBeChecked();
    expect(screen.queryByLabelText("Enlace")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("create screen is one page with turnos, materials and a primary publish button", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres/nuevo",
        Component: AdminWorkshopNew,
        action: () => null,
        loader: () => ({ teachers: TEACHERS, materials: MATERIALS }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/talleres/nuevo"]} />,
    );
    const publish = await screen.findByRole("button", {
      name: "Publicar y abrir inscripciones",
    });
    const form = publish.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(publish).toHaveAttribute("name", "intent");
    expect(publish).toHaveAttribute("value", "publish");
    expect(publish).toHaveAttribute("data-variant", "primary");
    const draft = screen.getByRole("button", { name: "Guardar borrador" });
    expect(draft).toHaveAttribute("value", "draft");
    expect(draft).toHaveAttribute("data-variant", "secondary");
    // The primary button is the first submit, so Enter publishes.
    expect(form?.querySelector("button[type=submit]")).toBe(publish);
    expect(container.querySelectorAll("[name=turnoWeekday]")).toHaveLength(5);
    expect(screen.getByText("+ otro turno")).toBeVisible();
    expect(screen.getByLabelText("Arcilla")).not.toBeChecked();
    // Derived fields are not asked.
    expect(screen.queryByLabelText("Enlace")).toBeNull();
    expect(screen.queryByLabelText("Resumen")).toBeNull();
    expect(screen.queryByLabelText("Técnica")).toBeNull();
    // The percentage stays closed until a third-party teacher is chosen.
    expect(
      screen
        .getByText("Porcentaje (solo profesores de terceros)")
        .closest("details"),
    ).not.toHaveAttribute("open");
    await expectNoAxeViolations(container);
  });

  it("create screen opens the percentage for a third-party teacher", async () => {
    const Stub = createRoutesStub([
      {
        id: "new",
        path: "/admin/talleres/nuevo",
        Component: AdminWorkshopNew,
        action: () => null,
        loader: () => ({ teachers: TEACHERS, materials: [] }),
      },
    ]);
    render(
      <Stub
        initialEntries={["/admin/talleres/nuevo"]}
        hydrationData={{
          loaderData: { new: { teachers: TEACHERS, materials: [] } },
          actionData: {
            new: {
              values: {
                name: "",
                description: "",
                teacherId: "t2",
                defaultFee: "",
                percentage: "",
                images: [],
                rows: EMPTY_ROWS,
                materialIds: [],
              },
              errors: {},
              turnoErrors: {},
              formError: "Revisá los campos marcados e intentá de nuevo.",
            },
          },
        }}
      />,
    );
    expect(
      (
        await screen.findByText("Porcentaje (solo profesores de terceros)")
      ).closest("details"),
    ).toHaveAttribute("open");
    expect(
      screen.getByText("Todavía no hay materiales en el catálogo."),
    ).toBeVisible();
  });

  it("edit screen of a published workshop loads the values, the lifecycle controls and the slug confirmation", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres/:id",
        Component: AdminWorkshopDetail,
        action: () => null,
        loader: () => ({
          id: "w1",
          status: "published",
          published: true,
          values: VALUES,
          teachers: TEACHERS,
          activeTurnos: 2,
          ...DETAIL_EXTRA,
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/talleres/w1"]} />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue(
      "Cerámica Creativa",
    );
    expect(screen.getByLabelText("Porcentaje acordado")).toHaveValue("35,5");
    expect(screen.getByLabelText("Profesor")).toHaveValue("t2");
    expect(screen.getByText("Publicado")).toBeVisible();
    expect(screen.getByText("2 turnos activos")).toBeVisible();
    expect(screen.getByRole("link", { name: "Editar turnos" })).toHaveAttribute(
      "href",
      "/admin/talleres/w1/turnos",
    );
    expect(screen.getByRole("link", { name: "Editar meses" })).toHaveAttribute(
      "href",
      "/admin/talleres/w1/periodos",
    );
    expect(screen.getByText(/Mañana: Martes 10:00 a 12:00/)).toBeVisible();
    expect(screen.getByRole("link", { name: "septiembre" })).toHaveAttribute(
      "href",
      "/admin/talleres/w1/periodos/2026-09",
    );
    expect(
      screen.getByText("Publicado. Falta abrir las inscripciones de octubre."),
    ).toBeVisible();
    expect(screen.queryByText(/pasos listos/)).toBeNull();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Archivar" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Eliminar borrador" }),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Entiendo que cambiar el enlace/),
    ).not.toBeChecked();
    await expectNoAxeViolations(container);
  });

  it("edit screen of a draft offers publish and delete, and shows a refused state change", async () => {
    const Stub = createRoutesStub([
      {
        id: "detail",
        path: "/admin/talleres/:id",
        Component: AdminWorkshopDetail,
        action: () => null,
        loader: () => ({
          id: "w1",
          status: "draft",
          published: false,
          values: VALUES,
          teachers: TEACHERS,
          activeTurnos: 0,
          ...DETAIL_EXTRA,
        }),
      },
    ]);
    render(
      <Stub
        initialEntries={["/admin/talleres/w1"]}
        hydrationData={{
          loaderData: {
            detail: {
              id: "w1",
              status: "draft",
              published: false,
              values: VALUES,
              teachers: TEACHERS,
              activeTurnos: 0,
              ...DETAIL_EXTRA,
            },
          },
          actionData: {
            detail: {
              stateError:
                "Para publicar falta: un profesor asignado, al menos un turno activo.",
            },
          },
        }}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Publicar" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Eliminar borrador" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Para publicar falta: un profesor asignado, al menos un turno activo.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByLabelText(/Entiendo que cambiar el enlace/),
    ).toBeNull();
  });

  it("detail shows a failed step banner when the one-click flow stopped", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres/:id",
        Component: AdminWorkshopDetail,
        action: () => null,
        loader: () => ({
          id: "w1",
          status: "draft",
          published: false,
          values: VALUES,
          teachers: TEACHERS,
          activeTurnos: 1,
          ...DETAIL_EXTRA,
          failure: "publish",
        }),
      },
    ]);
    render(<Stub initialEntries={["/admin/talleres/w1?fallo=publish"]} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El taller quedó como borrador porque no se pudo publicar.",
    );
  });

  it("detail shows breadcrumbs, the saved-as-draft banner and the single next step", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres/:id",
        Component: AdminWorkshopDetail,
        action: () => null,
        loader: () => ({
          id: "w1",
          status: "draft",
          published: false,
          values: VALUES,
          teachers: TEACHERS,
          activeTurnos: 0,
          ...DETAIL_EXTRA,
          feedback: "created",
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/talleres/w1?ok=created"]} />,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Taller guardado como borrador",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Cerámica Creativa" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver a talleres" }),
    ).toHaveAttribute("href", "/admin/talleres");
    expect(
      screen.getByRole("link", { name: "Abrir inscripciones de octubre" }),
    ).toHaveAttribute("href", "/admin/talleres/w1/periodos");
    await expectNoAxeViolations(container);
  });
});
