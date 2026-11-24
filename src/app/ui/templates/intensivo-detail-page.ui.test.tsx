import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import {
  IntensivoDetailPage,
  type IntensivoDetailProps,
} from "./intensivo-detail-page";

const image = {
  src: "/media/portada.webp",
  alt: "Portada",
  width: 8,
  height: 6,
};

const base: IntensivoDetailProps = {
  breadcrumb: {
    label: "Ruta de navegación",
    items: [{ label: "Workshops", href: "/intensivos" }, { label: "Demo" }],
  },
  name: "Workshop de cerámica",
  oneDay: "Un día.",
  image,
  dateLine: "sábado 14 de noviembre",
  duration: "4 horas",
  timeRange: "10:00 a 14:00",
  description: "Descripción del workshop.",
  price: { label: "Precio", amount: "$ 40.000" },
  deposit: { label: "Seña", amount: "$ 15.000" },
  conditions: {
    label: "Condiciones",
    policyText: "Política de prueba.",
    minSeats: "Mínimo de 4 personas.",
  },
  gallery: [],
  action: { kind: "inquiry", href: "/contacto", label: "Consultar" },
};

function renderPage(projects: IntensivoDetailProps["projects"]) {
  return render(
    <MemoryRouter>
      <IntensivoDetailPage {...base} {...(projects ? { projects } : {})} />
    </MemoryRouter>,
  );
}

describe("IntensivoDetailPage project cards", () => {
  it("shows the image and the description of a project, and nothing for one without them", () => {
    renderPage([
      {
        id: "p1",
        name: "Taza de torno",
        total: "$ 40.000",
        deposit: "$ 15.000",
        description: "Una taza al torno, lista para usar.",
        image,
      },
      {
        id: "p2",
        name: "Plato hondo",
        total: "$ 30.000",
        deposit: "$ 10.000",
      },
    ]);

    const section = screen.getByRole("region", { name: "Proyectos" });
    const [taza, plato] = within(section).getAllByRole("listitem");
    expect(
      within(taza as HTMLElement).getByText(
        "Una taza al torno, lista para usar.",
      ),
    ).toBeVisible();
    expect(within(taza as HTMLElement).getByRole("img")).toHaveAttribute(
      "src",
      "/media/portada.webp",
    );
    expect(plato?.querySelectorAll("p")).toHaveLength(2);
    expect(plato?.querySelector("img")).toBeNull();
  });
});
