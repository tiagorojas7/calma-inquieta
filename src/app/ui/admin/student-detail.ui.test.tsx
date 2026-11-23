import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  StudentDetail,
  type StudentDetailProps,
  type StudentRecordCard,
  type StudentSaleCard,
} from "./student-detail";

const sale: StudentSaleCard = {
  id: "s1",
  anchor: "v-ci-2026-0003",
  number: "CI-2026-0003",
  state: "owes",
  total: "$ 8.000",
  totalPesos: "8000",
  lines: [{ label: "Arcilla 1 kg", quantity: 2 }],
  delivery: null,
  canPay: true,
  canCancel: true,
  cancelRefund: null,
};

const owed: StudentRecordCard = {
  id: "o2",
  anchor: "r-ci-2026-0002",
  number: "CI-2026-0002",
  workshop: "Acuarela",
  month: "noviembre 2026",
  turno: "Martes 18:00",
  state: "owes",
  total: "$ 58.000",
  totalPesos: "58000",
  lines: [],
  delivery: null,
  canPay: true,
  canSell: true,
  canCancel: true,
  cancelRefund: null,
  sales: [sale],
};

const paid: StudentRecordCard = {
  ...owed,
  id: "o1",
  anchor: "r-ci-2026-0001",
  number: "CI-2026-0001",
  workshop: "Cerámica",
  month: "octubre 2026",
  state: "paid",
  canPay: false,
  cancelRefund: { paid: "$ 58.000", paidPesos: "58000" },
  lines: [{ label: "Pincel Chico", quantity: 1 }],
  delivery: "delivered",
  sales: [],
};

const cancelled: StudentRecordCard = {
  ...owed,
  id: "o0",
  anchor: "r-ci-2026-0000",
  number: "CI-2026-0000",
  workshop: "Dibujo",
  month: "septiembre 2026",
  state: "cancelled",
  canPay: false,
  canSell: false,
  canCancel: false,
  sales: [],
};

const props: StudentDetailProps = {
  student: {
    name: "Ana Pérez",
    email: "ana@example.com",
    phone: "5493515550000",
    phoneShown: "351 555-0000",
    phoneLink: "tel:+5493515550000",
    whatsappLink: "https://wa.me/5493515550000?text=",
    owes: "$ 66.000",
    seatDebts: [],
    active: true,
    records: [owed, paid, cancelled],
    attendance: "Vino 2 · Faltó 1 · Recuperos pendientes 0",
    note: { text: "Zurda.", meta: "Actualizadas por owner el 31/10/2026." },
  },
  path: "/admin/alumnas/ana%40example.com",
  today: "2026-11-05",
  enrollHref: "/admin/inscripciones/nueva?email=ana%40example.com",
  materials: [
    {
      materialId: "m-1",
      variantId: "v-1",
      name: "Arcilla",
      label: "1 kg",
      unitPrice: 4000,
      priceLabel: "$ 4.000",
      onHand: 3,
    },
  ],
};

const card = (name: string) => screen.getByRole("article", { name });

describe("StudentDetail", () => {
  it("shows her data, one primary way to enroll her again, and no table", () => {
    render(<StudentDetail {...props} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Ana Pérez" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Inscribir en otro mes" }),
    ).toHaveAttribute("href", props.enrollHref);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("opens with one line of what she owes, sales and workshops included, or Al día", () => {
    const { rerender } = render(<StudentDetail {...props} />);

    const line = screen.getByRole("group", { name: "Lo que debe" });
    expect(within(line).getByText("Debe $ 66.000")).toBeInTheDocument();
    expect(within(line).queryByText("Al día")).toBeNull();

    rerender(
      <StudentDetail {...props} student={{ ...props.student, owes: null }} />,
    );
    expect(
      within(screen.getByRole("group", { name: "Lo que debe" })).getByText(
        "Al día",
      ),
    ).toBeInTheDocument();
  });

  it("shows what she owes as the file's large figure, in the owed or paid tone", () => {
    const { rerender } = render(<StudentDetail {...props} />);

    const figure = () =>
      screen
        .getByRole("group", { name: "Lo que debe" })
        .querySelector("[data-summary-tone]");
    expect(figure()).toHaveTextContent("Debe $ 66.000");
    expect(figure()).toHaveAttribute("data-summary-tone", "owed");

    rerender(
      <StudentDetail {...props} student={{ ...props.student, owes: null }} />,
    );
    expect(figure()).toHaveTextContent("Al día");
    expect(figure()).toHaveAttribute("data-summary-tone", "paid");
  });

  it("names a workshop deposit or balance she owes, which has no card in the file", () => {
    render(
      <StudentDetail
        {...props}
        student={{
          ...props.student,
          seatDebts: [
            { label: "Saldo de Intensivo de cerámica", amount: "$ 25.000" },
          ],
        }}
      />,
    );

    const line = within(screen.getByRole("group", { name: "Lo que debe" }));
    expect(
      line.getByText("Saldo de Intensivo de cerámica"),
    ).toBeInTheDocument();
    expect(line.getByText("$ 25.000")).toBeInTheDocument();
  });

  it("shows her phone as people say it, to call or to write on WhatsApp", () => {
    render(<StudentDetail {...props} />);

    expect(screen.getByRole("link", { name: "351 555-0000" })).toHaveAttribute(
      "href",
      "tel:+5493515550000",
    );
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/5493515550000?text=",
    );
    expect(screen.queryByText("5493515550000")).toBeNull();
  });

  it("shows a phone it cannot format as it is, without a link it cannot dial", () => {
    render(
      <StudentDetail
        {...props}
        student={{
          ...props.student,
          phone: "12345",
          phoneShown: "12345",
          phoneLink: null,
          whatsappLink: null,
        }}
      />,
    );

    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
    expect(screen.queryByRole("link", { name: "12345" })).toBeNull();
  });

  it("uses the width of a desktop screen: the records sit side by side", () => {
    render(<StudentDetail {...props} />);

    const grid = card("Acuarela").parentElement;
    expect(grid?.className).toMatch(/xl:grid-cols-2/);
    expect(grid?.closest("section.max-w-3xl")).toBeNull();
  });

  it("uses the full desktop width for a single record", () => {
    render(
      <StudentDetail
        {...props}
        student={{ ...props.student, records: [owed] }}
      />,
    );

    const grid = card("Acuarela").parentElement;
    expect(grid?.className).not.toMatch(/xl:grid-cols-2/);
  });

  it("says what was just saved at the top", () => {
    render(<StudentDetail {...props} saved="cobro de Ana Pérez" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardado: cobro de Ana Pérez",
    );
  });

  it("makes one card per monthly record with workshop, month, turno, amount and the state in words", () => {
    render(<StudentDetail {...props} />);

    const first = within(card("Acuarela"));
    expect(first.getByText("$ 58.000", { exact: true })).toHaveClass(
      "text-2xl",
      "font-bold",
      "tabular-nums",
      "text-admin-warning-fg",
    );
    expect(
      first.getByText("noviembre 2026 · Martes 18:00"),
    ).toBeInTheDocument();
    expect(first.getAllByText("Debe $ 58.000").length).toBeGreaterThan(0);
    // A paid fee says so as a fee: the sales under it may still be owed.
    expect(
      within(card("Cerámica")).getByText("Cuota pagada"),
    ).toBeInTheDocument();
    expect(within(card("Cerámica")).queryByText("Pagado")).toBeNull();
    expect(within(card("Dibujo")).getByText("Cancelada")).toBeInTheDocument();
  });

  it("collects the full amount from the card and returns to the same card", () => {
    render(<StudentDetail {...props} />);

    // The record's own payment comes before the sales nested under it.
    const [collect] = within(card("Acuarela")).getAllByRole("button", {
      name: "Cobrar",
    });
    const form = collect?.closest("form");
    if (!form) throw new Error("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('[name="intent"]')).toHaveValue("confirm");
    expect(form.querySelector('[name="orderId"]')).toHaveValue("o2");
    expect(form.querySelector('[name="returnTo"]')).toHaveValue(props.path);
    expect(form.querySelector('[name="anchor"]')).toHaveValue("r-ci-2026-0002");
    // Another amount or day sits behind the options, closed.
    expect(form.querySelector('[name="amount"]')).toHaveValue("58000");
    expect(form.querySelector('[name="paidOn"]')).toHaveValue("2026-11-05");
    expect(form.querySelector("details")).not.toHaveAttribute("open");
  });

  it("offers no payment on a paid or cancelled record", () => {
    render(<StudentDetail {...props} />);

    expect(
      within(card("Cerámica")).queryByRole("button", { name: "Cobrar" }),
    ).not.toBeInTheDocument();
    expect(
      within(card("Dibujo")).queryByRole("button", { name: "Cobrar" }),
    ).not.toBeInTheDocument();
    expect(
      within(card("Dibujo")).queryByText("Vender materiales"),
    ).not.toBeInTheDocument();
  });

  it("nests the record's materials and its sales inside its card, with delivered or pending", () => {
    render(<StudentDetail {...props} />);

    const paidCard = within(card("Cerámica"));
    expect(paidCard.getByText("Pincel Chico × 1")).toBeInTheDocument();
    expect(paidCard.getByText("Entregado")).toBeInTheDocument();

    const nestedItem = document.getElementById("v-ci-2026-0003");
    if (!nestedItem) throw new Error("nested sale");
    expect(card("Acuarela")).toContainElement(nestedItem);
    const nested = within(nestedItem);
    expect(nested.getByText("Arcilla 1 kg × 2")).toBeInTheDocument();
    expect(nested.getByText("Debe $ 8.000")).toBeInTheDocument();
    // The sale is paid from its own place in the card, not from a card of its own.
    const pay = nested.getByRole("button", { name: "Cobrar" });
    expect(pay.closest("form")?.querySelector('[name="orderId"]')).toHaveValue(
      "s1",
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it('sells materials in an inline panel with "Ya pagó" and one submit', () => {
    render(<StudentDetail {...props} />);

    const panel = within(card("Acuarela"));
    expect(panel.getByText("Vender materiales")).toBeInTheDocument();
    const submit = panel.getByRole("button", { name: "Vender" });
    const form = submit.closest("form");
    if (!form) throw new Error("form");
    expect(form.querySelector('[name="intent"]')).toHaveValue("sale");
    expect(form.querySelector('[name="orderId"]')).toHaveValue("o2");
    expect(form.querySelector('[name="anchor"]')).toHaveValue("r-ci-2026-0002");
    const paidNow = within(form).getByRole("checkbox", { name: "Ya pagó" });
    expect(paidNow).toHaveAttribute("name", "paid");
    expect(paidNow).not.toBeChecked();
  });

  it("keeps cancelling behind the options and asks for the refund only on a paid record", () => {
    render(<StudentDetail {...props} />);

    const pendingCard = card("Acuarela");
    const summary = within(pendingCard).getByText("Cancelar inscripción", {
      selector: "summary",
    });
    expect(summary.closest("details")).not.toHaveAttribute("open");
    expect(
      pendingCard.querySelector('[name="refundAmount"]'),
    ).not.toBeInTheDocument();

    const paidForm = card("Cerámica")
      .querySelector('[name="reason"]')
      ?.closest("form");
    expect(paidForm?.querySelector('[name="refundAmount"]')).toHaveValue(
      "58000",
    );
    expect(paidForm?.querySelector('[name="refundedOn"]')).toHaveValue(
      "2026-11-05",
    );
  });

  it("shows a refusal on the card it came from and nowhere else", () => {
    render(
      <StudentDetail
        {...props}
        form={{
          orderId: "o2",
          intent: "confirm",
          message: "El monto no coincide con el total del pedido.",
        }}
      />,
    );

    expect(within(card("Acuarela")).getByRole("alert")).toHaveTextContent(
      "El monto no coincide",
    );
    expect(within(card("Cerámica")).queryByRole("alert")).toBeNull();
  });

  it("opens the sale panel again, with what was typed, after a refused sale", () => {
    render(
      <StudentDetail
        {...props}
        form={{
          orderId: "o2",
          intent: "sale",
          message: "Elegí al menos un material.",
          lines: [{ materialId: "m-1", variantId: "v-1", quantity: "3" }],
          paid: true,
        }}
      />,
    );

    const panel = within(card("Acuarela"));
    expect(panel.getByRole("checkbox", { name: "Ya pagó" })).toBeChecked();
    expect(panel.getByRole("spinbutton", { name: /Arcilla 1 kg/ })).toHaveValue(
      3,
    );
  });

  it("keeps attendance and her note behind Ver más, and posts the note to this page", () => {
    render(<StudentDetail {...props} />);

    const more = screen.getByText("Ver más", { selector: "summary" });
    const details = more.closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(
      within(details as HTMLElement).getByText(
        "Vino 2 · Faltó 1 · Recuperos pendientes 0",
      ),
    ).toBeInTheDocument();
    const note = screen.getByLabelText("Nota");
    expect(note).toHaveValue("Zurda.");
    expect(note.closest("form")?.querySelector('[name="intent"]')).toHaveValue(
      "note",
    );
  });

  it("changes her state from Editar, behind the options", () => {
    render(<StudentDetail {...props} />);

    const edit = screen.getByText("Editar", { selector: "summary" });
    expect(edit.closest("details")).not.toHaveAttribute("open");
    const button = screen.getByRole("button", { name: "Pasar a inactiva" });
    expect(
      button.closest("form")?.querySelector('[name="intent"]'),
    ).toHaveValue("deactivate");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StudentDetail {...props} saved="cobro de Ana Pérez" />,
    );

    await expectNoAxeViolations(container);
  });
});
