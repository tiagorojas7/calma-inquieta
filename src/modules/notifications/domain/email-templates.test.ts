import { describe, expect, it } from "vitest";
import {
  classTomorrowEmail,
  enrollmentReceivedEmail,
  eventInquiryEmail,
  feePendingEmail,
  paymentConfirmedEmail,
} from "./email-templates";

const order = {
  studentName: "Ana Pérez",
  number: "CI-2026-0007",
  workshopName: "Bordado",
  periodLabel: "noviembre 2026",
  turnoLabel: "Martes a la tarde",
  total: "$ 58.000",
  orderUrl: "https://calma.example.test/pedido/abc123",
};

describe("email templates", () => {
  it("greets by first name with voseo and links the order", () => {
    const email = enrollmentReceivedEmail(order);
    expect(email.subject).toBe("Recibimos tu inscripción CI-2026-0007");
    expect(email.text).toContain("Hola, Ana.");
    expect(email.text).toContain("CI-2026-0007");
    expect(email.text).toContain("$ 58.000");
    expect(email.text).toContain("https://calma.example.test/pedido/abc123");
    expect(email.html).toContain(
      'href="https://calma.example.test/pedido/abc123"',
    );
  });

  it("confirms the payment", () => {
    const email = paymentConfirmedEmail(order);
    expect(email.subject).toBe("Confirmamos tu pago");
    expect(email.text).toContain("Bordado");
    expect(email.text).toContain("Martes a la tarde");
  });

  it("reminds tomorrow's class", () => {
    const email = classTomorrowEmail({
      studentName: "Ana Pérez",
      workshopName: "Bordado",
      turnoLabel: "Martes a la tarde",
      startsAt: "17:30",
    });
    expect(email.subject).toBe("Mañana tenés clase");
    expect(email.text).toContain("17:30");
  });

  it("reminds the pending fee", () => {
    const email = feePendingEmail(order);
    expect(email.subject).toBe("Tu cuota está pendiente");
    expect(email.text).toContain("noviembre 2026");
    expect(email.text).toContain("comprobante");
  });

  it("never says workshop and uses intensivo wording", () => {
    for (const email of [
      enrollmentReceivedEmail(order),
      paymentConfirmedEmail(order),
      feePendingEmail(order),
    ]) {
      expect(`${email.subject} ${email.text}`).not.toMatch(/workshop/i);
    }
  });

  it("escapes every interpolated value in the html body", () => {
    const email = enrollmentReceivedEmail({
      ...order,
      studentName: "<b>Ana</b>",
      workshopName: "A & B",
    });
    expect(email.html).not.toContain("<b>Ana</b>");
    expect(email.html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
    expect(email.html).toContain("A &amp; B");
  });

  it("summarizes a private event inquiry for the studio", () => {
    const email = eventInquiryEmail({
      fullName: "Lu Gómez",
      phone: "5493511234567",
      email: null,
      desiredDate: "2026-12-05",
      place: "Cumpleaños en casa",
      participants: 8,
      notes: null,
    });
    expect(email.subject).toBe("Nueva consulta de evento: Lu Gómez");
    expect(email.text).toContain("5493511234567");
    expect(email.text).toContain("2026-12-05");
    expect(email.text).toContain("8");
  });
});
