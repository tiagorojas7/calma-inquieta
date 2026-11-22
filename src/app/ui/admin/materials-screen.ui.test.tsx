import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { MaterialsScreen, type MaterialsScreenProps } from "./materials-screen";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";

const base: MaterialsScreenProps = {
  studio: [
    {
      id: ID_A,
      anchor: `material-${ID_A}`,
      name: "Bastidor",
      price: "$ 2.500",
      state: "hay",
      onHand: 4,
      variantId: "va",
      variants: [],
    },
    {
      id: ID_B,
      anchor: `material-${ID_B}`,
      name: "Pincel plano",
      price: "$ 1.000",
      state: "sin",
      onHand: 0,
      variantId: "vb",
      variants: [],
    },
    {
      id: ID_C,
      anchor: `material-${ID_C}`,
      name: "Acrílico",
      price: "Desde $ 1.500",
      state: "hay",
      onHand: 2,
      variants: [
        { id: "vc1", label: "Rojo", state: "hay", onHand: 2 },
        { id: "vc2", label: "Azul", state: "sin", onHand: 0 },
      ],
    },
  ],
  studioTotal: 3,
  studioQuery: "",
  catalog: { rows: [], found: 0, total: 99 },
  query: "",
  estado: "activos",
  period: "2026-11",
  periodLabel: "noviembre 2026",
  returnTo: "/admin/materiales?mes=2026-11",
  suppliers: [
    {
      supplierId: "s1",
      supplierName: "Papelería Sur",
      materials: [
        { label: "Arcilla Grande", quantity: 3 },
        {
          label: "Arcilla Grande",
          quantity: 2,
          origin: "Torno intensivo",
          originId: "w1",
        },
      ],
      total: "$ 3.600",
      summary: "Pedido a Papelería Sur\n- Arcilla Grande x5",
      orderIds: ["o1", "o2"],
      workshops: [{ id: "w1", name: "Torno intensivo" }],
    },
  ],
  pendingOrders: 0,
  toDeliver: [
    {
      id: "d1",
      studentName: "Ana Pérez",
      detail: "Cerámica · Lunes 18:00",
      lines: [{ label: "Arcilla Grande", quantity: 2 }],
      whatsappHref: "https://wa.me/5493515550001",
    },
    {
      id: "d2",
      studentName: "Eva Stock",
      detail: "Cerámica · Miércoles 10:00",
      lines: [{ label: "Esmalte Azul", quantity: 1 }],
      fromStock: true,
    },
  ],
  delivered: [
    {
      id: "d3",
      studentName: "Cata Díaz",
      detail: "Pintura · Jueves 16:00",
      lines: [{ label: "Pincel Fino", quantity: 3 }],
    },
  ],
};

const view = (overrides: Partial<MaterialsScreenProps> = {}) =>
  render(<MaterialsScreen {...base} {...overrides} />);

const cardOf = (name: string) =>
  screen.getByRole("article", { name: new RegExp(`^${name}`) });

afterEach(() => {
  vi.unstubAllGlobals();
});

const catalogRows = [
  { id: ID_A, anchor: `catalogo-${ID_A}`, name: "Bastidor", kept: true },
  {
    id: ID_B,
    anchor: `catalogo-${ID_B}`,
    name: "Arcilla blanca",
    kept: false,
  },
];

describe("Materiales screen: the order of the sections", () => {
  it("shows Para entregar, Para pedir, En el estudio and Catálogo, in that order, under one title", () => {
    view();
    expect(
      screen.getByRole("heading", { level: 1, name: "Materiales" }),
    ).toBeVisible();
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Para entregar", "Para pedir", "En el estudio", "Catálogo"]);
  });

  it("puts a count beside each section heading", () => {
    view();
    const countOf = (name: string) =>
      screen
        .getByRole("heading", { level: 2, name })
        .parentElement?.querySelector("[data-count]")?.textContent;
    expect(countOf("Para entregar")).toBe("2");
    expect(countOf("Para pedir")).toBe("1");
    expect(countOf("En el estudio")).toBe("3");
    expect(countOf("Catálogo")).toBe("99");
  });

  it("has no Todos, Hay or Sin stock filter any more", () => {
    view();
    expect(
      screen.queryByRole("navigation", { name: "Mostrar" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sin stock" })).toBeNull();
  });
});

describe("Materiales screen: En el estudio", () => {
  it("keeps the studio list compact and searchable instead of stretching cards in a grid", () => {
    view();
    const section = screen.getByRole("region", { name: "En el estudio" });
    expect(
      within(section).getByRole("search", { name: "Buscar en el estudio" }),
    ).toBeVisible();
    expect(
      within(section).getByRole("list", { name: "Materiales en el estudio" }),
    ).not.toHaveClass("grid");
  });
  it("says Hay N or Se acabó in words on every material card", () => {
    view();
    expect(within(cardOf("Bastidor")).getByText("Hay 4")).toBeVisible();
    expect(within(cardOf("Pincel plano")).getByText("Se acabó")).toBeVisible();
    expect(within(cardOf("Bastidor")).getByText("$ 2.500")).toBeVisible();
    expect(screen.queryByText("Sin stock")).toBeNull();
  });

  it("keeps each variant's stock visible and reveals only its own stock form", () => {
    view();
    const lines = within(
      screen.getByRole("list", { name: "Variantes de Acrílico" }),
    ).getAllByRole("listitem");
    expect(lines).toHaveLength(2);
    expect(within(lines[0] as HTMLElement).getByText("Rojo")).toBeVisible();
    expect(within(lines[0] as HTMLElement).getByText("Hay 2")).toBeVisible();
    expect(within(lines[1] as HTMLElement).getByText("Se acabó")).toBeVisible();
    for (const line of lines) {
      expect(within(line).getByText("Cargar unidades")).toBeVisible();
      expect(line.querySelector("details")).not.toHaveAttribute("open");
    }
    fireEvent.click(
      within(lines[1] as HTMLElement).getByText("Cargar unidades"),
    );
    expect(
      within(lines[1] as HTMLElement).getByRole("button", { name: "Llegaron" }),
    ).toBeVisible();
    expect((lines[1] as HTMLElement).querySelector("details")).toHaveAttribute(
      "open",
    );
    expect(
      (lines[0] as HTMLElement).querySelector("details"),
    ).not.toHaveAttribute("open");
    expect(within(cardOf("Acrílico")).getAllByText("Hay 2")).toHaveLength(2);
  });

  it("offers a native Llegaron form that adds units to the variant and returns to the card", () => {
    view();
    const card = cardOf("Bastidor");
    const field = within(card).getByLabelText("Cuántas llegaron de Bastidor");
    expect(field).toHaveAttribute("type", "number");
    expect(field).toHaveAttribute("name", "units");
    expect(field).toBeRequired();
    const form = field.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form?.querySelector('[name="intent"]')).toHaveValue("arrived");
    expect(form?.querySelector('[name="materialId"]')).toHaveValue(ID_A);
    expect(form?.querySelector('[name="variantId"]')).toHaveValue("va");
    expect(form?.querySelector('[name="returnTo"]')).toHaveValue(
      "/admin/materiales?mes=2026-11",
    );
    expect(form?.querySelector('[name="anchor"]')).toHaveValue(
      `material-${ID_A}`,
    );
    expect(
      within(card).getByRole("button", { name: "Llegaron" }),
    ).toBeVisible();
  });

  it("links each card to its editor", () => {
    view();
    expect(
      screen.getByRole("link", { name: "Editar Bastidor" }),
    ).toHaveAttribute("href", `/admin/materiales/${ID_A}`);
  });

  it("highlights the material that was just saved", () => {
    view({ highlightId: ID_B });
    expect(cardOf("Pincel plano")).toHaveAttribute("data-highlight");
    expect(cardOf("Bastidor")).not.toHaveAttribute("data-highlight");
  });

  it("says what was saved, and a refused Llegaron on its own card", () => {
    view({
      saved: "llegaron 5 unidades",
      arrivedError: {
        anchor: `material-${ID_A}`,
        message: "Poné una cantidad mayor a cero.",
      },
    });
    expect(screen.getByText("Guardado: llegaron 5 unidades")).toBeVisible();
    expect(within(cardOf("Bastidor")).getByRole("alert")).toHaveTextContent(
      "Poné una cantidad mayor a cero.",
    );
    expect(
      within(cardOf("Pincel plano")).queryByRole("alert"),
    ).not.toBeInTheDocument();
  });

  it("says so in a few words when the studio keeps nothing yet", () => {
    view({ studio: [] });
    expect(
      screen.getByText("Todavía no hay materiales en el estudio."),
    ).toBeVisible();
  });
});

describe("Materiales screen: Catálogo", () => {
  it("is a search and nothing else until the owner searches", () => {
    view();
    const section = screen.getByRole("region", { name: "Catálogo" });
    const search = within(section).getByRole("search", { name: "Buscar" });
    expect(search).toHaveAttribute("method", "get");
    expect(within(section).getByLabelText("Buscar material")).toHaveValue("");
    expect(within(section).queryByRole("list")).toBeNull();
    expect(
      within(section).getByText("Buscá un material por su nombre."),
    ).toBeVisible();
    expect(
      within(section).getByRole("link", { name: "Nuevo material" }),
    ).toHaveAttribute("href", "/admin/materiales/nuevo");
  });

  it("lists simple rows with Editar and the yes or no after a search", () => {
    view({
      query: "a",
      catalog: { rows: catalogRows, found: 2, total: 99 },
    });
    const section = screen.getByRole("region", { name: "Catálogo" });
    const rows = within(
      within(section).getByRole("list", { name: "Resultados" }),
    ).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(
      within(rows[0] as HTMLElement).getByText("En el estudio"),
    ).toBeVisible();
    expect(within(rows[1] as HTMLElement).getByText("Se pide")).toBeVisible();
    expect(
      within(rows[1] as HTMLElement).getByRole("link", {
        name: "Editar Arcilla blanca",
      }),
    ).toHaveAttribute("href", `/admin/materiales/${ID_B}`);
  });

  it("marks a material as kept with one native post that comes back to its row", () => {
    view({
      query: "a",
      catalog: { rows: catalogRows, found: 2, total: 99 },
    });
    const button = screen.getByRole("button", {
      name: "Lo tenemos en el estudio: Arcilla blanca",
    });
    expect(button).toHaveTextContent("Lo tenemos en el estudio");
    const form = button.closest("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('[name="intent"]')).toHaveValue("set-kept");
    expect(form.querySelector('[name="materialId"]')).toHaveValue(ID_B);
    expect(form.querySelector('[name="kept"]')).toHaveValue("1");
    expect(form.querySelector('[name="returnTo"]')).toHaveValue(
      "/admin/materiales?mes=2026-11",
    );
    expect(form.querySelector('[name="anchor"]')).toHaveValue(
      `catalogo-${ID_B}`,
    );
  });

  it("unmarks a kept material the same way", () => {
    view({
      query: "a",
      catalog: { rows: catalogRows, found: 2, total: 99 },
    });
    const button = screen.getByRole("button", {
      name: "Ya no lo tenemos: Bastidor",
    });
    const form = button.closest("form") as HTMLFormElement;
    expect(form.querySelector('[name="kept"]')).toHaveValue("0");
    expect(form.querySelector('[name="intent"]')).toHaveValue("set-kept");
  });

  it("says when nothing matches, and how many matched when only some are shown", () => {
    const { unmount } = view({
      query: "zzz",
      catalog: { rows: [], found: 0, total: 99 },
    });
    expect(screen.getByText("No encontramos nada.")).toBeVisible();
    unmount();
    view({
      query: "a",
      catalog: { rows: catalogRows, found: 30, total: 99 },
    });
    expect(
      screen.getByText("Mostrando 2 de 30. Escribí más para afinar."),
    ).toBeVisible();
  });

  it("says there are no materials when the catalog is empty", () => {
    view({ studio: [], catalog: { rows: [], found: 0, total: 0 } });
    expect(screen.getByText("Todavía no hay materiales.")).toBeVisible();
  });

  it("highlights a result that was just marked", () => {
    view({
      highlightId: ID_B,
      query: "a",
      catalog: { rows: catalogRows, found: 2, total: 99 },
    });
    const marked = screen
      .getAllByRole("listitem")
      .filter((item) => item.hasAttribute("data-highlight"));
    expect(marked.map((row) => row.id)).toEqual([`catalogo-${ID_B}`]);
  });
});

describe("Materiales screen: Para pedir", () => {
  it("shows each supplier with its lines, the workshop of a workshop line and one total", () => {
    view();
    const card = screen.getByRole("article", { name: "Papelería Sur" });
    expect(within(card).getByText("Total $ 3.600")).toBeVisible();
    expect(within(card).getAllByText("Cantidad: 3")).toHaveLength(1);
    expect(within(card).getByText("Workshop: Torno intensivo")).toBeVisible();
  });

  it("has one Ya lo pedí per supplier that carries the monthly orders and the workshops", () => {
    view();
    const buttons = screen.getAllByRole("button", { name: /^Ya lo pedí/ });
    expect(buttons).toHaveLength(1);
    const form = buttons[0]?.closest("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('[name="intent"]')).toHaveValue(
      "mark-supplier-requested",
    );
    expect(form.querySelector('[name="supplierId"]')).toHaveValue("s1");
    expect(
      [...form.querySelectorAll('[name="orderId"]')].map(
        (input) => (input as HTMLInputElement).value,
      ),
    ).toEqual(["o1", "o2"]);
    expect(
      [...form.querySelectorAll('[name="workshopId"]')].map(
        (input) => (input as HTMLInputElement).value,
      ),
    ).toEqual(["w1"]);
    expect(form.querySelector('[name="mes"]')).toHaveValue("2026-11");
    expect(form.querySelector('[name="anchor"]')).toHaveValue("pedir-s1");
  });

  it("hides Ya lo pedí when nothing can be marked", () => {
    const [supplier] = base.suppliers;
    if (!supplier) throw new Error("missing supplier");
    view({ suppliers: [{ ...supplier, orderIds: [], workshops: [] }] });
    expect(
      screen.queryByRole("button", { name: /^Ya lo pedí/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar pedido" })).toBeVisible();
  });

  it("copies the order text and keeps the text behind Ver el texto", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    view();
    fireEvent.click(screen.getByRole("button", { name: "Copiar pedido" }));
    expect(writeText).toHaveBeenCalledWith(base.suppliers[0]?.summary);
    const more = screen.getByText("Ver el texto").closest("details");
    expect(more).not.toHaveAttribute("open");
    expect(within(more as HTMLElement).getByRole("textbox")).toHaveAttribute(
      "readonly",
    );
  });

  it("counts the orders still to confirm and says when there is nothing to order", () => {
    const { unmount } = view({ pendingOrders: 2 });
    expect(screen.getByText("2 sin confirmar")).toBeVisible();
    unmount();
    view({ suppliers: [] });
    expect(screen.getByText("No hay nada para pedir.")).toBeVisible();
  });
});

describe("Materiales screen: Para entregar", () => {
  it("has Entregado per student, each a native form back to her card", () => {
    view();
    const card = screen.getByRole("article", { name: "Ana Pérez" });
    const button = within(card).getByRole("button", {
      name: "Entregado a Ana Pérez",
    });
    expect(button).toHaveTextContent("Entregado");
    const form = button.closest("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('[name="intent"]')).toHaveValue("mark-received");
    expect(form.querySelector('[name="orderId"]')).toHaveValue("d1");
    expect(form.querySelector('[name="anchor"]')).toHaveValue("entregar-d1");
    expect(within(card).getByText("Pedido")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "WhatsApp con Ana Pérez" }),
    ).toHaveAttribute("href", "https://wa.me/5493515550001");
  });

  it("marks a stock order as coming from the stock", () => {
    view();
    expect(
      within(screen.getByRole("article", { name: "Eva Stock" })).getByText(
        "Del stock",
      ),
    ).toBeVisible();
  });

  it("hands over everything with one form carrying every order", () => {
    view();
    const form = screen
      .getByRole("button", { name: "Entregar todo" })
      .closest("form") as HTMLFormElement;
    expect(
      [...form.querySelectorAll('[name="orderId"]')].map(
        (input) => (input as HTMLInputElement).value,
      ),
    ).toEqual(["d1", "d2"]);
    expect(form.querySelector('[name="anchor"]')).toHaveValue("para-entregar");
  });

  it("does not offer Entregar todo for a single student", () => {
    view({ toDeliver: [base.toDeliver[0] as never] });
    expect(
      screen.queryByRole("button", { name: "Entregar todo" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the already delivered ones behind a closed disclosure without actions", () => {
    view();
    const more = screen.getByText("Ya entregados: 1").closest("details");
    expect(more).not.toHaveAttribute("open");
    expect(
      within(more as HTMLElement).queryByRole("button"),
    ).not.toBeInTheDocument();
    expect(
      within(more as HTMLElement).getByText("Cata Díaz"),
    ).toBeInTheDocument();
  });

  it("says when there is nothing to hand over", () => {
    view({ toDeliver: [], delivered: [] });
    expect(screen.getByText("No hay nada para entregar.")).toBeVisible();
  });
});

describe("Materiales screen: month and tools", () => {
  it("keeps the month behind Otro mes, closed, with the current month named", () => {
    view();
    expect(screen.getByText("Mostrando noviembre 2026")).toBeVisible();
    const more = screen.getByText("Otro mes").closest("details");
    expect(more).not.toHaveAttribute("open");
    const form = within(more as HTMLElement).getByRole("search", {
      name: "Mes",
    });
    expect(form).toHaveAttribute("method", "get");
    expect(form.querySelector('[name="mes"]')).toHaveValue("2026-11");
  });

  it("keeps the rarely used tools behind Herramientas, closed", () => {
    view();
    const more = screen.getByText("Herramientas").closest("details");
    expect(more).not.toHaveAttribute("open");
    const tools = within(more as HTMLElement);
    expect(
      tools.getByRole("link", { name: "Importar lista de precios" }),
    ).toHaveAttribute("href", "/admin/materiales/importar");
    expect(tools.getByRole("link", { name: "Subir precios" })).toHaveAttribute(
      "href",
      "/admin/materiales/precios",
    );
    expect(tools.getByRole("link", { name: "Proveedores" })).toHaveAttribute(
      "href",
      "/admin/materiales/proveedores",
    );
    expect(
      tools.getByRole("link", { name: "Materiales archivados" }),
    ).toHaveAttribute("href", "/admin/materiales?estado=inactivos");
  });

  it("offers the way back from the archived materials", () => {
    view({ estado: "inactivos" });
    expect(
      screen.getByRole("link", { name: "Materiales activos" }),
    ).toHaveAttribute("href", "/admin/materiales");
  });
});

describe("Materiales screen: every post is native", () => {
  it("has no form without method post or get and never a data request", () => {
    const { container } = view();
    for (const form of container.querySelectorAll("form")) {
      expect(["post", "get"]).toContain(form.getAttribute("method"));
      expect(form.getAttribute("action") ?? "").not.toContain(".data");
    }
  });

  it("has no accessibility violations", async () => {
    const { container } = view({
      saved: "llegaron 5 unidades",
      highlightId: ID_A,
      pendingOrders: 1,
    });
    await expectNoAxeViolations(container);
  });

  it("puts the stocked count and supplier total in large, bold summaries", () => {
    view();

    expect(cardOf("Bastidor").querySelector("p.text-2xl")).toHaveTextContent(
      "Hay 4",
    );
    expect(
      cardOf("Papelería Sur").querySelector("p.text-2xl"),
    ).toHaveTextContent("$ 3.600");
  });
});
