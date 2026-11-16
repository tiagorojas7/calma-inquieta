import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  EnrollmentCorrectionForm,
  EnrollmentCorrectionHistory,
  type CorrectionFormModel,
  type CorrectionHistoryEntry,
} from "./enrollment-correction";

const options = [
  { value: "ceramica|2026-11|t-1", label: "Cerámica · noviembre 2026 · Lunes" },
  {
    value: "ceramica|2026-11|t-2",
    label: "Cerámica · noviembre 2026 · Jueves",
  },
];

const pending: CorrectionFormModel = {
  options,
  feePesos: "48000",
  paid: null,
};
const paid: CorrectionFormModel = { ...pending, paid: "$ 58.000" };

const summary = (turno: string, fee: string, total: string) => ({
  workshop: "Cerámica",
  month: "noviembre 2026",
  turno,
  fee,
  total,
});

const entries: readonly CorrectionHistoryEntry[] = [
  {
    at: "31/10/2026 16:00",
    actor: "admin@example.com",
    note: "La cuota estaba mal",
    outcome: "returned-to-pending",
    before: summary("Lunes", "$ 48.000", "$ 58.000"),
    after: summary("Jueves", "$ 60.000", "$ 70.000"),
    previousPayment: {
      amount: "$ 58.000",
      paidOn: "30/10/2026",
      confirmedBy: "admin@example.com",
    },
    refund: null,
  },
  {
    at: "31/10/2026 17:00",
    actor: "otra@example.com",
    note: null,
    outcome: "lowered",
    before: summary("Jueves", "$ 60.000", "$ 70.000"),
    after: summary("Jueves", "$ 52.000", "$ 62.000"),
    previousPayment: null,
    refund: {
      amount: "$ 8.000",
      refundedOn: "31/10/2026",
      note: "Transferencia",
    },
  },
];

describe("EnrollmentCorrectionForm", () => {
  it("posts the correction to the same route with the current fee and a way to keep the place", () => {
    render(
      <EnrollmentCorrectionForm correction={pending} today="2026-10-31" />,
    );

    const form = screen.getByRole("form", { name: "Corregir inscripción" });
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('input[name="intent"]')).toHaveValue("correct");
    const offer = within(form).getByRole("combobox", {
      name: "Taller, mes y turno",
    });
    expect(
      within(offer)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Dejar el actual",
      "Cerámica · noviembre 2026 · Lunes",
      "Cerámica · noviembre 2026 · Jueves",
    ]);
    expect(offer).toHaveValue("");
    expect(within(form).getByRole("textbox", { name: "Cuota" })).toHaveValue(
      "48000",
    );
    expect(
      within(form).getByRole("textbox", { name: "Motivo (opcional)" }),
    ).toHaveValue("");
    expect(
      within(form).getByRole("button", { name: "Guardar corrección" }),
    ).toHaveAttribute("type", "submit");
  });

  it("asks for the refunded difference only when something was paid", () => {
    const { rerender } = render(
      <EnrollmentCorrectionForm correction={pending} today="2026-10-31" />,
    );
    expect(screen.queryByText("Diferencia devuelta")).toBeNull();
    expect(screen.queryByLabelText("Monto devuelto")).toBeNull();

    rerender(<EnrollmentCorrectionForm correction={paid} today="2026-10-31" />);

    const group = screen.getByRole("group", { name: "Diferencia devuelta" });
    expect(within(group).getByText(/Cobraste \$ 58\.000/)).toBeVisible();
    expect(within(group).getByLabelText("Monto devuelto")).toHaveValue("");
    const date = within(group).getByLabelText("Fecha de devolución");
    expect(date).toHaveValue("2026-10-31");
    expect(date).toHaveAttribute("max", "2026-10-31");
    expect(
      within(group).getByLabelText("Nota de la devolución (opcional)"),
    ).toHaveValue("");
  });

  it("shows what was typed and the message of every refused field", () => {
    render(
      <EnrollmentCorrectionForm
        correction={paid}
        today="2026-10-31"
        form={{
          values: {
            correctOffer: "ceramica|2026-11|t-2",
            correctFee: "50.5",
            correctNote: "por error",
            correctRefundAmount: "9000",
            correctRefundedOn: "2026-10-30",
            correctRefundNote: "efectivo",
          },
          errors: {
            correctOffer: "Elegí una opción válida.",
            correctFee: "Ingresá la cuota en pesos enteros.",
            correctNote: "El motivo es demasiado largo.",
            correctRefundAmount: "Es mayor que la diferencia.",
            correctRefundedOn: "La fecha no puede ser futura.",
            correctRefundNote: "La nota es demasiado larga.",
          },
        }}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveValue("ceramica|2026-11|t-2");
    expect(screen.getByRole("textbox", { name: "Cuota" })).toHaveValue("50.5");
    expect(screen.getByLabelText("Monto devuelto")).toHaveValue("9000");
    expect(screen.getByLabelText("Fecha de devolución")).toHaveValue(
      "2026-10-30",
    );
    for (const message of [
      "Elegí una opción válida.",
      "Ingresá la cuota en pesos enteros.",
      "El motivo es demasiado largo.",
      "Es mayor que la diferencia.",
      "La fecha no puede ser futura.",
      "La nota es demasiado larga.",
    ])
      expect(screen.getByText(message)).toBeVisible();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <EnrollmentCorrectionForm correction={paid} today="2026-10-31" />,
    );
    await expectNoAxeViolations(container);
  });
});

describe("EnrollmentCorrectionHistory", () => {
  it("renders nothing for an order that was never corrected", () => {
    const { container } = render(<EnrollmentCorrectionHistory entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every correction, collapsed, oldest first, with what changed and the money that moved", () => {
    const { container } = render(
      <EnrollmentCorrectionHistory entries={entries} />,
    );

    const disclosure = screen.getByText("Correcciones (2)").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    const items = within(disclosure as HTMLElement).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const [first, second] = items;
    if (!first || !second) throw new Error("missing correction");

    expect(within(first).getByText("31/10/2026 16:00")).toBeInTheDocument();
    expect(within(first).getByText("admin@example.com")).toBeInTheDocument();
    expect(within(first).getByText("Volvió a pendiente")).toBeInTheDocument();
    expect(
      within(first).getByText(
        "Cerámica · noviembre 2026 · Lunes · cuota $ 48.000 · total $ 58.000",
      ),
    ).toBeInTheDocument();
    expect(
      within(first).getByText(
        "Cerámica · noviembre 2026 · Jueves · cuota $ 60.000 · total $ 70.000",
      ),
    ).toBeInTheDocument();
    expect(within(first).getByText("La cuota estaba mal")).toBeInTheDocument();
    expect(
      within(first).getByText(
        "Cobro anterior que quedó sin efecto: $ 58.000 el 30/10/2026, confirmado por admin@example.com.",
      ),
    ).toBeInTheDocument();
    expect(within(first).queryByText(/Diferencia devuelta/)).toBeNull();

    expect(within(second).getByText("otra@example.com")).toBeInTheDocument();
    expect(
      within(second).getByText("Siguió cobrado con el total más bajo"),
    ).toBeInTheDocument();
    expect(
      within(second).getByText("Diferencia devuelta: $ 8.000 el 31/10/2026."),
    ).toBeInTheDocument();
    expect(
      within(second).getByText("Nota de la devolución: Transferencia"),
    ).toBeInTheDocument();
    expect(within(second).queryByText(/Cobro anterior/)).toBeNull();
    expect(container).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <EnrollmentCorrectionHistory entries={entries} />,
    );
    await expectNoAxeViolations(container);
  });
});
