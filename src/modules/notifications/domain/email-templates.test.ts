import { describe, expect, it } from "vitest";
import {
  classTomorrowEmail,
  enrollmentReceivedEmail,
  eventInquiryEmail,
  feePendingEmail,
  intensiveReservationConfirmedEmail,
  intensiveReservationReceivedEmail,
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

  it("does not call a monthly taller a workshop", () => {
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

  describe("intensivo reservation emails", () => {
    const reservation = {
      studentName: "Ana Pérez",
      intensivoName: "Bordado libre",
      dateLabel: "sábado 5 de diciembre",
      deposit: "$ 20.000",
      reservationUrl: "https://calma.example.test/reserva/abc123",
    };

    it("acknowledges the request with the deposit and the summary link", () => {
      const email = intensiveReservationReceivedEmail(reservation);
      expect(email.subject).toBe("Recibimos tu reserva");
      expect(email.text).toContain("Hola, Ana.");
      expect(email.text).toContain("Bordado libre");
      expect(email.text).toContain("sábado 5 de diciembre");
      expect(email.text).toContain("$ 20.000");
      expect(email.text).toContain(reservation.reservationUrl);
      expect(email.html).toContain(`href="${reservation.reservationUrl}"`);
    });

    it("confirms the reservation", () => {
      const email = intensiveReservationConfirmedEmail(reservation);
      expect(email.subject).toBe("Confirmamos tu reserva");
      expect(email.text).toContain("Bordado libre");
      expect(email.text).toContain("sábado 5 de diciembre");
      expect(email.text).toContain(reservation.reservationUrl);
    });

    it("calls the one-day event a workshop, never an intensivo", () => {
      for (const email of [
        intensiveReservationReceivedEmail(reservation),
        intensiveReservationConfirmedEmail(reservation),
      ]) {
        expect(`${email.subject} ${email.text}`).not.toMatch(/intensivo/i);
        expect(email.text).toMatch(/el workshop Bordado libre/);
      }
    });

    it("escapes interpolated values in the html body", () => {
      const email = intensiveReservationReceivedEmail({
        ...reservation,
        intensivoName: "A & B",
      });
      expect(email.html).toContain("A &amp; B");
    });
  });
});
