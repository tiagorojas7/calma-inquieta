import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensiveForm } from "~/app/ui/admin/intensive-form";
import AdminIntensiveDetail from "./intensive-detail";
import AdminIntensiveNew from "./intensive-new";
import AdminIntensives from "./intensives";

describe("intensive admin screens", () => {
  it("renders list rows and native anchors", async () => {
    const Stub = createRoutesStub([
      {
        id: "intensives",
        path: "/admin/intensivos",
        Component: AdminIntensives,
        loader: () => ({
          filter: "vigentes",
          rows: [
            {
              id: "i1",
              name: "Cerámica de sábado",
              teacherName: "Ana Gómez",
              status: "draft",
              dateTime: "10 oct 2026, 10:00",
              capacity: 12,
            },
          ],
        }),
      },
    ]);
    const { container } = render(
      <Stub
        initialEntries={["/admin/intensivos"]}
        hydrationData={{
          loaderData: {
            intensives: {
              filter: "vigentes",
              rows: [
                {
                  id: "i1",
                  name: "Cerámica de sábado",
                  teacherName: "Ana Gómez",
                  status: "draft",
                  dateTime: "10 oct 2026, 10:00",
                  capacity: 12,
                },
              ],
            },
          },
        }}
      />,
    );
    expect(
      await screen.findByRole("link", { name: "Cerámica de sábado" }),
    ).toHaveAttribute("href", "/admin/intensivos/i1");
    expect(screen.getByText("Lugares: 12")).toBeVisible();
    expect(screen.getByRole("link", { name: "Archivados" })).toHaveAttribute(
      "href",
      "/admin/intensivos?estado=archivados",
    );
    await expectNoAxeViolations(container);
  }, 30_000);

  it("renders the main fields, six ImageField inputs, closed advanced options and no lifecycle controls", async () => {
    const Stub = createRoutesStub([
      {
        id: "intensive-new",
        path: "/admin/intensivos/nuevo",
        Component: AdminIntensiveNew,
        loader: () => ({
          teachers: [{ id: "t1", name: "Ana", modality: "own" }],
          materialChoices: [],
        }),
        action: () => null,
      },
    ]);
    const { container } = render(
      <Stub
        initialEntries={["/admin/intensivos/nuevo"]}
        hydrationData={{
          loaderData: {
            "intensive-new": {
              teachers: [{ id: "t1", name: "Ana", modality: "own" }],
              materialChoices: [],
            },
          },
        }}
      />,
    );
    expect(await screen.findByLabelText("Nombre")).toBeVisible();
    expect(screen.getByLabelText("Fecha")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Incluye materiales")).not.toBeChecked();
    expect(screen.getAllByLabelText("Imagen")).toHaveLength(6);
    // The workshop has no price: its first project does.
    expect(container.querySelector("input[name=price]")).toBeNull();
    expect(container.querySelector("input[name=deposit]")).toBeNull();
    const first = screen.getByRole("group", { name: "Proyecto 1" });
    expect(first.querySelector("input[name=project0Name]")).toBe(
      within(first).getByLabelText("Nombre del proyecto"),
    );
    expect(
      within(first).getByLabelText("Precio total (en pesos)"),
    ).toHaveAttribute("name", "project0Price");
    expect(within(first).getByLabelText("Seña (en pesos)")).toHaveAttribute(
      "name",
      "project0Deposit",
    );
    expect(
      within(first).getByLabelText("Descripción (opcional)"),
    ).toHaveAttribute("name", "project0Description");
    expect(
      within(first).getByText("Imagen del proyecto (opcional)"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Agregar otro proyecto" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^Quitar proyecto/ }),
    ).toBeNull();
    const advanced = screen
      .getByText("Opciones avanzadas")
      .closest("details") as HTMLDetailsElement;
    expect(advanced.open).toBe(false);
    for (const label of [
      "Cupos mínimos",
      "Política de cancelación y ausencias",
      "Porcentaje acordado",
      "Incluye materiales",
    ])
      expect(within(advanced).getByLabelText(label)).toBeInTheDocument();
    expect(screen.queryByLabelText("Enlace")).toBeNull();
    expect(screen.queryByLabelText("Resumen")).toBeNull();
    const more = screen
      .getByText("Agregar más imágenes")
      .closest("details") as HTMLDetailsElement;
    expect(more.open).toBe(false);
    expect(within(more).getAllByLabelText("Imagen")).toHaveLength(4);
    expect(
      within(
        screen.getByRole("region", { name: "Imágenes" }),
      ).getAllByLabelText("Imagen"),
    ).toHaveLength(6);
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/intensivos",
    );
    expect(screen.getByRole("button", { name: "Publicar" })).toHaveAttribute(
      "value",
      "publish",
    );
    expect(
      screen.getByRole("button", { name: "Guardar borrador" }),
    ).toHaveAttribute("value", "draft");
    expect(screen.queryByRole("button", { name: "Archivar" })).toBeNull();
    await expectNoAxeViolations(container);
  }, 30_000);

  it("shows what was typed and each refusal beside its own field, project fields included", () => {
    render(
      <IntensiveForm
        values={{
          name: "Cerámica de sábado",
          slug: "",
          summary: "",
          description: "Un detalle",
          teacherId: "t1",
          percentage: "",
          eventDate: "2026-10-10",
          startsAt: "10:00",
          endsAt: "13:00",
          capacity: "12",
          minSeats: "",
          policyText: "",
          materialsIncluded: false,
          images: [],
        }}
        projects={[
          {
            name: "",
            price: "1000",
            deposit: "2000",
            description: "Mi texto",
            image: null,
            materials: [],
          },
          {
            name: "Plato",
            price: "",
            deposit: "",
            description: "",
            image: null,
            materials: [],
          },
        ]}
        materialChoices={[]}
        errors={{
          capacity: "Completá este campo.",
          project0Name: "Completá el nombre del proyecto.",
          project0Deposit: "No puede superar el precio.",
          project1Price: "Completá este campo.",
        }}
        teachers={[{ id: "t1", name: "Ana", modality: "own" }]}
        cancelHref="/admin/intensivos"
        mode="new"
      />,
    );

    const first = screen.getByRole("group", { name: "Proyecto 1" });
    expect(within(first).getByLabelText("Nombre del proyecto")).toHaveValue("");
    expect(within(first).getByLabelText("Precio total (en pesos)")).toHaveValue(
      "1000",
    );
    expect(within(first).getByLabelText("Seña (en pesos)")).toHaveValue("2000");
    expect(within(first).getByLabelText("Descripción (opcional)")).toHaveValue(
      "Mi texto",
    );
    expect(
      within(first).getByText("Completá el nombre del proyecto."),
    ).toBeVisible();
    expect(
      within(first).getByText("No puede superar el precio."),
    ).toBeVisible();
    // A project error is never shown as a workshop field error, nor in another block.
    expect(within(first).queryByText("Completá este campo.")).toBeNull();
    const second = screen.getByRole("group", { name: "Proyecto 2" });
    expect(within(second).getByLabelText("Nombre del proyecto")).toHaveValue(
      "Plato",
    );
    expect(within(second).getByText("Completá este campo.")).toBeVisible();
    expect(
      within(second).queryByText("Completá el nombre del proyecto."),
    ).toBeNull();
    expect(screen.getByLabelText("Capacidad")).toHaveAccessibleDescription(
      "Completá este campo.",
    );
  });

  it("renders the edit screen and audit without axe violations", async () => {
    const Stub = createRoutesStub([
      {
        id: "intensive-detail",
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        loader: () => ({
          id: "i1",
          values: {
            name: "Cerámica de sábado",
            slug: "ceramica-sabado",
            summary: "Un resumen",
            description: "Un detalle",
            teacherId: "t1",
            percentage: "35",
            eventDate: "2026-10-10",
            startsAt: "10:00",
            endsAt: "13:00",
            capacity: "12",
            minSeats: "4",
            policyText: "Traé delantal.",
            materialsIncluded: true,
            images: [],
          },
          projects: [],
          teachers: [{ id: "t1", name: "Ana", modality: "own" }],
          audit: {
            updatedBy: "admin@example.com",
            updatedAt: "10 oct 2026, 09:00",
          },
        }),
        action: () => null,
      },
    ]);
    const { container } = render(
      <Stub
        initialEntries={["/admin/intensivos/i1"]}
        hydrationData={{
          loaderData: {
            "intensive-detail": {
              id: "i1",
              values: {
                name: "Cerámica de sábado",
                slug: "ceramica-sabado",
                summary: "Un resumen",
                description: "Un detalle",
                teacherId: "t1",
                percentage: "35",
                eventDate: "2026-10-10",
                startsAt: "10:00",
                endsAt: "13:00",
                capacity: "12",
                minSeats: "4",
                policyText: "Traé delantal.",
                materialsIncluded: true,
                images: [],
              },
              projects: [],
              teachers: [{ id: "t1", name: "Ana", modality: "own" }],
              audit: {
                updatedBy: "admin@example.com",
                updatedAt: "10 oct 2026, 09:00",
              },
            },
          },
        }}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Cerámica de sábado",
      }),
    ).toBeVisible();
    expect(screen.getByText("admin@example.com")).toBeVisible();
    expect(screen.getByText("10 oct 2026, 09:00")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver reservas" })).toHaveAttribute(
      "href",
      "/admin/intensivos/i1/reservas",
    );
    await expectNoAxeViolations(container);
  }, 30_000);

  it("redisplays the rejected gallery preview source", () => {
    render(
      <IntensiveForm
        values={{
          name: "Cerámica de sábado",
          slug: "ceramica-sabado",
          summary: "Un resumen",
          description: "Un detalle",
          teacherId: "t1",
          percentage: "35",
          eventDate: "2026-10-10",
          startsAt: "10:00",
          endsAt: "13:00",
          capacity: "12",
          minSeats: "4",
          policyText: "Traé delantal.",
          materialsIncluded: true,
          images: [
            {
              assetId: "img-1",
              src: "/imagenes/img-1.webp",
              alt: "Una taza",
            },
          ],
        }}
        errors={{}}
        teachers={[{ id: "t1", name: "Ana", modality: "own" }]}
        cancelHref="/admin/intensivos"
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/imagenes/img-1.webp",
    );
  });
});

const values = {
  name: "Cerámica de sábado",
  slug: "ceramica-sabado",
  summary: "Un resumen",
  description: "Un detalle",
  teacherId: "t1",
  percentage: "",
  eventDate: "2026-10-10",
  startsAt: "10:00",
  endsAt: "13:00",
  capacity: "12",
  minSeats: "4",
  policyText: "Traé delantal.",
  materialsIncluded: true,
  images: [],
};

describe("intensive detail lifecycle controls", () => {
  it("keeps lifecycle controls out of the edit form and renders a native reschedule panel", async () => {
    const Stub = createRoutesStub([
      {
        id: "detail",
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        action: () => null,
        loader: () => ({
          id: "i1",
          status: "published",
          values,
          projects: [],
          teachers: [{ id: "t1", name: "Ana", modality: "own" }],
          audit: { updatedBy: "a@x.test", updatedAt: "10 oct 2026, 10:00" },
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/intensivos/i1"]} />,
    );
    expect(await screen.findByText("Publicado")).toBeVisible();
    const edit = screen.getByLabelText("Nombre").closest("form");
    await userEvent.click(screen.getByText("Otras acciones"));
    expect(edit?.querySelector("input[name=intent]")).toHaveValue("save");
    expect(edit?.querySelector("button[name=intent]")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Pausar" }).closest("form"),
    ).not.toBe(edit);
    expect(
      screen.getByRole("button", { name: "Reprogramar" }).closest("form"),
    ).not.toBe(edit);
    await expectNoAxeViolations(container);
  });

  it("shows what is missing after a refused publish and keeps one primary action", async () => {
    const Stub = createRoutesStub([
      {
        id: "detail",
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        action: () => null,
        loader: () => ({
          id: "i1",
          status: "draft",
          missing: ["teacher", "future-start"],
          feedback: "created",
          values,
          projects: [],
          teachers: [],
          audit: { updatedBy: "a", updatedAt: "hoy" },
        }),
      },
    ]);
    render(<Stub initialEntries={["/admin/intensivos/i1"]} />);
    expect(
      await screen.findByText(
        "El workshop quedó como borrador porque falta: un profesor asignado, una fecha futura.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Workshop creado")).toBeVisible();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeVisible();
  });

  it("preserves edit-gallery errors separately from a rejected reschedule", async () => {
    const Stub = createRoutesStub([
      {
        id: "detail",
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        action: () => null,
        loader: () => ({
          id: "i1",
          status: "draft",
          values,
          projects: [],
          teachers: [],
          audit: { updatedBy: "a", updatedAt: "hoy" },
        }),
      },
    ]);
    render(
      <Stub
        initialEntries={["/admin/intensivos/i1"]}
        hydrationData={{
          loaderData: {
            detail: {
              id: "i1",
              status: "draft",
              values,
              projects: [],
              teachers: [],
              audit: { updatedBy: "a", updatedAt: "hoy" },
            },
          },
          actionData: {
            detail: {
              reschedule: {
                values: { eventDate: "", startsAt: "14:00", endsAt: "10:00" },
                errors: { eventDate: "Completá este campo." },
              },
            },
          },
        }}
      />,
    );
    expect((await screen.findAllByLabelText("Fecha")).at(-1)).toHaveValue("");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Cerámica de sábado");
    expect(screen.getByText("Completá este campo.")).toBeVisible();
  });
});

describe("intensive form on a wide screen", () => {
  const draft = {
    name: "",
    slug: "",
    summary: "",
    description: "",
    teacherId: "",
    percentage: "",
    eventDate: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    minSeats: "",
    policyText: "",
    materialsIncluded: false,
    images: [],
  };
  const teachers = [{ id: "t1", name: "Ana", modality: "own" as const }];

  it("a new intensive puts the main data and the images on one side and the projects on the other, with the actions below", () => {
    const { container } = render(
      <IntensiveForm
        values={draft}
        errors={{}}
        teachers={teachers}
        cancelHref="/admin/intensivos"
        mode="new"
      />,
    );

    const columns = container.querySelector("[data-columns]");
    expect(columns).not.toBeNull();
    const [start, end] = Array.from(columns?.children ?? []) as [
      HTMLElement,
      HTMLElement,
    ];
    expect(within(start).getByLabelText("Nombre")).toBeVisible();
    expect(
      within(start).getByRole("heading", { name: "Imágenes" }),
    ).toBeVisible();
    expect(within(start).getByText("Opciones avanzadas")).toBeVisible();
    expect(
      within(end).getByRole("group", { name: "Proyecto 1" }),
    ).toBeVisible();
    expect(within(end).queryByLabelText("Nombre")).toBeNull();
    const publish = screen.getByRole("button", { name: "Publicar" });
    expect(columns).not.toContainElement(publish);
    expect(columns?.compareDocumentPosition(publish)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("an edited intensive keeps the main data on one side and the images and options on the other", () => {
    const { container } = render(
      <IntensiveForm
        values={draft}
        errors={{}}
        teachers={teachers}
        cancelHref="/admin/intensivos"
      />,
    );

    const columns = container.querySelector("[data-columns]");
    const [start, end] = Array.from(columns?.children ?? []) as [
      HTMLElement,
      HTMLElement,
    ];
    expect(within(start).getByLabelText("Nombre")).toBeVisible();
    expect(
      within(end).getByRole("heading", { name: "Imágenes" }),
    ).toBeVisible();
    expect(within(end).getByText("Opciones avanzadas")).toBeVisible();
    expect(columns).not.toContainElement(
      screen.getByRole("button", { name: "Guardar" }),
    );
  });
});
