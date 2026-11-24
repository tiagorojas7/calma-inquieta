import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  EnrollmentConsolidation,
  type DeliveryCardView,
  type EnrollmentConsolidationProps,
} from "./enrollment-consolidation";

const ana: DeliveryCardView = {
  id: "o1",
  studentName: "Ana Pérez",
  detail: "Cerámica · Lunes 18:00",
  lines: [
    { label: "Arcilla Grande", quantity: 2 },
    { label: "Esmalte Azul", quantity: 1 },
  ],
  whatsappHref: "https://wa.me/5493515550001",
};
const bea: DeliveryCardView = {
  id: "o2",
  studentName: "Bea Gómez",
  detail: "Cerámica · Martes 10:00",
  lines: [{ label: "Arcilla Grande", quantity: 1 }],
};
const eva: DeliveryCardView = {
  id: "o4",
  studentName: "Eva Stock",
  detail: "Cerámica · Miércoles 10:00",
  lines: [{ label: "Arcilla Grande", quantity: 2 }],
  fromStock: true,
};
const cata: DeliveryCardView = {
  id: "o3",
  studentName: "Cata Díaz",
  detail: "Pintura · Jueves 16:00",
  lines: [{ label: "Pincel Fino", quantity: 3 }],
};

const base: EnrollmentConsolidationProps = {
  period: "2026-11",
  periodLabel: "noviembre 2026",
  grandTotal: "$ 3.000",
  pendingOrders: 2,
  section: "pedir",
  counts: { pedir: 2, entregar: 2 },
  toDeliver: [ana, bea],
  delivered: [cata],
  suppliers: [
    {
      supplierId: "s1",
      supplierName: "Papelería Sur",
      materials: [{ label: "Arcilla Grande", quantity: 3, total: "$ 3.000" }],
      total: "$ 3.000",
      summary:
        "Pedido a Papelería Sur\nMes: noviembre 2026\n- Arcilla Grande x3",
      orderIds: ["o1", "o2"],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EnrollmentConsolidation: shell", () => {
  it("has one Materiales title, a month form and two section links with counts", async () => {
    const { container } = render(<EnrollmentConsolidation {...base} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /noviembre 2026/ }),
    ).toBeVisible();
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(within(form).getByLabelText("Mes")).toHaveValue("2026-11");
    const sections = screen.getByRole("navigation", {
      name: "Secciones de materiales",
    });
    const pedir = within(sections).getByRole("link", { name: /Para pedir/ });
    const entregar = within(sections).getByRole("link", {
      name: /Para entregar/,
    });
    expect(pedir).toHaveAttribute(
      "href",
      "/admin/inscripciones/materiales?mes=2026-11&seccion=pedir",
    );
    expect(pedir).toHaveAttribute("aria-current", "page");
    expect(entregar).toHaveAttribute(
      "href",
      "/admin/inscripciones/materiales?mes=2026-11&seccion=entregar",
    );
    expect(entregar).not.toHaveAttribute("aria-current");
    expect(pedir).toHaveTextContent("2");
    await expectNoAxeViolations(container);
  });

  it("keeps the selected section when the month changes", () => {
    const { container } = render(
      <EnrollmentConsolidation {...base} section="entregar" />,
    );

    expect(
      container.querySelector('form[role="search"] input[name="seccion"]'),
    ).toHaveValue("entregar");
  });

  it("shows the success notice and the refusal", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        notice={{ kind: "requested", count: 2 }}
        formError="Se marcaron 1 de 2 pedidos."
      />,
    );

    expect(
      screen
        .getByText("Se marcaron 2 pedidos como solicitados.")
        .closest("[role=status]"),
    ).not.toBeNull();
    expect(screen.queryByText(/marcá cada pedido como recibido/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Ir a Para entregar" }),
    ).toHaveAttribute(
      "href",
      "/admin/inscripciones/materiales?mes=2026-11&seccion=entregar",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Se marcaron 1 de 2 pedidos.",
    );
  });

  it("announces received orders with their count", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        section="entregar"
        notice={{ kind: "received", count: 3 }}
      />,
    );

    expect(
      screen.getByText("3 pedidos marcados como recibidos."),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Ir a Para entregar" }),
    ).toBeNull();
  });
});

describe("EnrollmentConsolidation: workshop lines", () => {
  const [first] = base.suppliers as [
    EnrollmentConsolidationProps["suppliers"][number],
  ];
  const mixed: EnrollmentConsolidationProps = {
    ...base,
    suppliers: [
      {
        ...first,
        materials: [
          ...first.materials,
          {
            label: "Arcilla Grande",
            quantity: 2,
            total: "$ 600",
            origin: "Torno intensivo",
            originId: "w1",
          },
        ],
      },
    ],
  };

  it("shows which workshop a line is for, apart from the monthly line of the same material", () => {
    render(<EnrollmentConsolidation {...mixed} />);

    const list = screen.getByRole("list", {
      name: "Papelería Sur: Material",
    });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Arcilla Grande");
    expect(rows[0]).toHaveTextContent("Cantidad: 3");
    expect(within(rows[0] as HTMLElement).queryByText(/Workshop/)).toBeNull();
    expect(rows[1]).toHaveTextContent("Cantidad: 2");
    expect(rows[1]).toHaveTextContent("Workshop: Torno intensivo");
  });

  it("gives each workshop of the supplier its own Ya lo pedí, apart from the monthly one", () => {
    const { container } = render(
      <EnrollmentConsolidation
        {...mixed}
        suppliers={[
          {
            ...first,
            materials: [
              ...first.materials,
              {
                label: "Arcilla Grande",
                quantity: 2,
                total: "$ 600",
                origin: "Torno intensivo",
                originId: "w1",
              },
              {
                label: "Esmalte Azul",
                quantity: 1,
                total: "$ 100",
                origin: "Torno intensivo",
                originId: "w1",
              },
              {
                label: "Arcilla Grande",
                quantity: 4,
                total: "$ 1.200",
                origin: "Pintura intensiva",
                originId: "w2",
              },
            ],
          },
        ]}
      />,
    );

    const torno = screen.getByRole("form", {
      name: "Workshop: Torno intensivo",
    });
    const pintura = screen.getByRole("form", {
      name: "Workshop: Pintura intensiva",
    });
    expect(torno).toHaveAttribute("method", "post");
    expect(
      within(torno).getByRole("button", { name: "Ya lo pedí" }),
    ).toBeVisible();
    expect(
      within(pintura).getByRole("button", { name: "Ya lo pedí" }),
    ).toBeVisible();
    expect(torno.querySelector('input[name="intent"]')).toHaveValue(
      "mark-workshop-requested",
    );
    expect(torno.querySelector('input[name="workshopId"]')).toHaveValue("w1");
    expect(pintura.querySelector('input[name="workshopId"]')).toHaveValue("w2");
    expect(torno.querySelector('input[name="supplierId"]')).toHaveValue("s1");
    expect(torno.querySelector('input[name="mes"]')).toHaveValue("2026-11");
    expect(torno.querySelector('input[name="seccion"]')).toHaveValue("pedir");
    expect(torno.querySelector('input[name="orderId"]')).toBeNull();
    // The monthly form is still there, once, with its own orders.
    expect(
      container.querySelectorAll(
        'input[name="intent"][value="mark-requested"]',
      ),
    ).toHaveLength(1);
    expect(container.querySelectorAll('input[name="orderId"]')).toHaveLength(2);
  });

  it("offers only the workshop's Ya lo pedí for a supplier that only has workshop lines", () => {
    const { container } = render(
      <EnrollmentConsolidation
        {...mixed}
        suppliers={[
          {
            ...first,
            materials: [
              {
                label: "Arcilla Grande",
                quantity: 2,
                total: "$ 600",
                origin: "Torno intensivo",
                originId: "w1",
              },
            ],
            orderIds: [],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("form", { name: "Workshop: Torno intensivo" }),
    ).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Ya lo pedí" })).toHaveLength(
      1,
    );
    expect(
      container.querySelector('input[name="intent"][value="mark-requested"]'),
    ).toBeNull();
  });

  it("announces the workshop lines just marked, with their count and no delivery link", () => {
    render(
      <EnrollmentConsolidation
        {...mixed}
        notice={{ kind: "workshop-requested", count: 3 }}
      />,
    );

    expect(
      screen
        .getByText("Se marcaron 3 materiales del workshop como pedidos.")
        .closest("[role=status]"),
    ).not.toBeNull();
    expect(
      screen.queryByRole("link", { name: "Ir a Para entregar" }),
    ).toBeNull();
  });

  it("announces a single line in the singular", () => {
    render(
      <EnrollmentConsolidation
        {...mixed}
        notice={{ kind: "workshop-requested", count: 1 }}
      />,
    );

    expect(
      screen.getByText("Se marcó 1 material del workshop como pedido."),
    ).toBeVisible();
  });

  it("has no accessibility violations with workshop forms", async () => {
    const { container } = render(<EnrollmentConsolidation {...mixed} />);

    await expectNoAxeViolations(container);
  });
});

describe("EnrollmentConsolidation: record", () => {
  it("links to the month's materials record in Estadísticas", () => {
    render(<EnrollmentConsolidation {...base} />);

    expect(
      screen.getByRole("link", { name: "Ver registro de materiales del mes" }),
    ).toHaveAttribute(
      "href",
      `/admin/estadisticas?mes=${base.period}#registro-materiales`,
    );
  });
});

describe("EnrollmentConsolidation: layout", () => {
  it("puts the month control in the title sheet and names the page Materiales", () => {
    render(<EnrollmentConsolidation {...base} />);

    expect(
      screen.getByRole("search").closest("[data-title-sheet]"),
    ).not.toBeNull();
    expect(screen.queryByText("Secciones de materiales")).toBeNull();
    expect(screen.getByText("Materiales")).toBeVisible();
  });

  it("opens Para pedir with what the month costs and how many suppliers it takes", () => {
    const { container } = render(<EnrollmentConsolidation {...base} />);

    const summary = container.querySelector(
      "[data-order-summary]",
    ) as HTMLElement;
    expect(summary).toHaveTextContent("Total general");
    expect(summary).toHaveTextContent("1 proveedor");
    expect(
      summary.compareDocumentPosition(
        screen.getByRole("region", { name: "Papelería Sur" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("counts several suppliers in the plural", () => {
    const [first] = base.suppliers as [
      EnrollmentConsolidationProps["suppliers"][number],
    ];
    const { container } = render(
      <EnrollmentConsolidation
        {...base}
        suppliers={[
          first,
          { ...first, supplierId: "s2", supplierName: "Otro" },
        ]}
      />,
    );

    expect(container.querySelector("[data-order-summary]")).toHaveTextContent(
      "2 proveedores",
    );
  });

  it("does not show the summary when there is nothing to buy", () => {
    const { container } = render(
      <EnrollmentConsolidation {...base} suppliers={[]} pendingOrders={0} />,
    );

    expect(container.querySelector("[data-order-summary]")).toBeNull();
  });

  it("shows the supplier total beside the supplier name", () => {
    render(<EnrollmentConsolidation {...base} />);

    const section = screen.getByRole("region", { name: "Papelería Sur" });
    const head = within(section)
      .getByRole("heading", { level: 2, name: "Papelería Sur" })
      .closest("[data-supplier-head]") as HTMLElement;
    expect(head).toHaveTextContent("Total del proveedor");
  });

  it("splits a supplier in what to order and the steps to order it", () => {
    render(<EnrollmentConsolidation {...base} />);

    const section = screen.getByRole("region", { name: "Papelería Sur" });
    expect(
      within(section).getByRole("heading", { level: 3, name: "Qué pedir" }),
    ).toBeVisible();
    const steps = within(section).getByRole("list", {
      name: "Pasos para pedir a Papelería Sur",
    });
    expect(steps.tagName).toBe("OL");
    const [copyStep, doneStep] = within(steps).getAllByRole("listitem");
    expect(copyStep).toHaveTextContent(
      "Copiá el pedido y mandalo por WhatsApp",
    );
    expect(
      within(copyStep as HTMLElement).getByLabelText(
        "Pedido para Papelería Sur",
      ),
    ).toBeVisible();
    expect(
      within(copyStep as HTMLElement).getByRole("button", {
        name: "Copiar pedido",
      }),
    ).toBeVisible();
    expect(doneStep).toHaveTextContent("Cuando lo mandes, marcalo como pedido");
    expect(
      within(doneStep as HTMLElement).getByRole("button", {
        name: "Ya lo pedí",
      }),
    ).toBeVisible();
  });

  it("leaves only the copy step when no order can still be marked", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        suppliers={base.suppliers.map((supplier) => ({
          ...supplier,
          orderIds: [],
        }))}
      />,
    );

    const steps = screen.getByRole("list", {
      name: "Pasos para pedir a Papelería Sur",
    });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(1);
  });

  it("makes the unconfirmed orders stand out from the page", () => {
    render(<EnrollmentConsolidation {...base} />);

    expect(screen.getByText(/2 pedidos a confirmar/)).toHaveClass(
      "bg-status-orange-bg",
    );
  });

  it("passes the accessibility check with the steps open", async () => {
    const { container } = render(<EnrollmentConsolidation {...base} />);

    await expectNoAxeViolations(container);
  });
});

describe("EnrollmentConsolidation: Para pedir", () => {
  it("shows each supplier with its materials, totals and the pending count", () => {
    render(<EnrollmentConsolidation {...base} />);

    const section = screen.getByRole("region", { name: "Papelería Sur" });
    expect(within(section).getByText("Arcilla Grande")).toBeVisible();
    expect(within(section).getByText("Cantidad: 3")).toBeVisible();
    expect(within(section).queryByRole("table")).toBeNull();
    expect(within(section).getAllByText("$ 3.000").length).toBeGreaterThan(0);
    expect(screen.getByText(/2 pedidos a confirmar/)).toBeVisible();
    expect(screen.queryByText("Ana Pérez")).toBeNull();
  });

  it("offers a readonly order text and one hidden id per paid order", () => {
    const { container } = render(<EnrollmentConsolidation {...base} />);

    expect(screen.getByLabelText("Pedido para Papelería Sur")).toHaveValue(
      base.suppliers[0]?.summary,
    );
    expect(screen.getByLabelText("Pedido para Papelería Sur")).toHaveAttribute(
      "readonly",
    );
    const ids = container.querySelectorAll('input[name="orderId"]');
    expect([...ids].map((input) => input.getAttribute("value"))).toEqual([
      "o1",
      "o2",
    ]);
    expect(
      container.querySelector('input[name="intent"][value="mark-requested"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('input[name="seccion"][value="pedir"]'),
    ).not.toBeNull();
    expect(container.querySelector('input[name="mes"]')).toHaveValue("2026-11");
    expect(screen.getByRole("button", { name: "Ya lo pedí" })).toBeVisible();
  });

  it("hides Ya lo pedí when no order can still be requested", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        suppliers={base.suppliers.map((supplier) => ({
          ...supplier,
          orderIds: [],
        }))}
      />,
    );

    expect(screen.queryByRole("button", { name: "Ya lo pedí" })).toBeNull();
  });

  it("copies the order text to the clipboard", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<EnrollmentConsolidation {...base} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar pedido" }));

    expect(writeText).toHaveBeenCalledWith(base.suppliers[0]?.summary);
  });

  it("says when there is nothing to buy", () => {
    render(
      <EnrollmentConsolidation {...base} suppliers={[]} pendingOrders={0} />,
    );

    expect(
      screen.getByText("No hay materiales para pedir este mes"),
    ).toBeVisible();
  });
});

describe("EnrollmentConsolidation: Para entregar", () => {
  const entregar = { ...base, section: "entregar" as const };

  it("shows one card per student with her own materials and a Recibido form", async () => {
    const { container } = render(<EnrollmentConsolidation {...entregar} />);

    const list = screen.getByRole("list", { name: "Pedidos para entregar" });
    const first = within(list)
      .getByRole("heading", { name: "Ana Pérez" })
      .closest("li") as HTMLElement;
    expect(within(first).getByText("Cerámica · Lunes 18:00")).toBeVisible();
    expect(within(first).getByText("Arcilla Grande")).toBeVisible();
    expect(within(first).getByText("Cantidad: 2")).toBeVisible();
    expect(within(first).getByText("Esmalte Azul")).toBeVisible();
    expect(within(first).getByText("Pedido")).toBeVisible();
    expect(
      within(first).getByRole("link", { name: "WhatsApp con Ana Pérez" }),
    ).toHaveAttribute("href", "https://wa.me/5493515550001");
    const form = first.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('input[name="intent"]')).toHaveValue(
      "mark-received",
    );
    expect(form.querySelector('input[name="orderId"]')).toHaveValue("o1");
    expect(form.querySelector('input[name="seccion"]')).toHaveValue("entregar");
    expect(
      within(form).getByRole("button", {
        name: "Marcar como recibido el pedido de Ana Pérez",
      }),
    ).toBeVisible();
    const second = within(list)
      .getByRole("heading", { name: "Bea Gómez" })
      .closest("li") as HTMLElement;
    expect(within(second).queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    expect(screen.queryByText("Papelería Sur")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("marks everything received with one form carrying every pending order", () => {
    const { container } = render(<EnrollmentConsolidation {...entregar} />);

    const bulk = screen
      .getByRole("button", { name: "Marcar todo recibido" })
      .closest("form") as HTMLFormElement;
    expect(bulk.querySelector('input[name="intent"]')).toHaveValue(
      "mark-received",
    );
    expect(
      [...bulk.querySelectorAll('input[name="orderId"]')].map((input) =>
        input.getAttribute("value"),
      ),
    ).toEqual(["o1", "o2"]);
    expect(
      within(bulk).getByText("Marca 2 pedidos como recibidos."),
    ).toBeVisible();
    expect(container.querySelectorAll("form").length).toBeGreaterThan(2);
  });

  it("lists the already received orders in a collapsed section without actions", () => {
    const { container } = render(<EnrollmentConsolidation {...entregar} />);

    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(within(details).getByText("Ya entregados (1)")).toBeInTheDocument();
    expect(within(details).getByText("Cata Díaz")).toBeInTheDocument();
    expect(within(details).getByText("Pincel Fino")).toBeInTheDocument();
    expect(within(details).queryByRole("button")).toBeNull();
  });

  it("hides the bulk button when nothing is waiting and says so", () => {
    render(<EnrollmentConsolidation {...entregar} toDeliver={[]} />);

    expect(
      screen.queryByRole("button", { name: "Marcar todo recibido" }),
    ).toBeNull();
    expect(
      screen.getByText("No hay materiales para entregar este mes"),
    ).toBeVisible();
  });
});

describe("EnrollmentConsolidation: orders served from stock", () => {
  it("shows a paid stock-only order as in stock and lets it be marked received without a request", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        section="entregar"
        toDeliver={[ana, eva]}
      />,
    );

    const card = screen
      .getByRole("heading", { name: "Eva Stock" })
      .closest("li");
    if (card === null) throw new Error("missing card");
    expect(within(card).getByText("En stock")).toBeVisible();
    expect(within(card).queryByText("Pedido")).toBeNull();
    const form = within(card)
      .getByRole("button", {
        name: "Marcar como recibido el pedido de Eva Stock",
      })
      .closest("form");
    expect(form?.querySelector('input[name="orderId"]')).toHaveValue("o4");
  });

  it("keeps the requested chip on an order that was asked from the supplier", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        section="entregar"
        toDeliver={[ana, eva]}
      />,
    );

    const card = screen
      .getByRole("heading", { name: "Ana Pérez" })
      .closest("li");
    if (card === null) throw new Error("missing card");
    expect(within(card).getByText("Pedido")).toBeVisible();
    expect(within(card).queryByText("En stock")).toBeNull();
  });
});
