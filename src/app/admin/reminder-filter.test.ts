import { describe, expect, it } from "vitest";
import { parseReminderRequest } from "./reminder-filter";

const WORKSHOP = "7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50";

const parse = (query: string) =>
  parseReminderRequest(new URLSearchParams(query));

describe("parseReminderRequest", () => {
  it("prepares nothing until a message is chosen", () => {
    const { request, values } = parse("");
    expect(request).toBeNull();
    expect(values.mensaje).toBe("class");
    expect(parse("mensaje=nope").request).toBeNull();
  });

  it("reads the template, its inputs and the audience filters", () => {
    const { request, values } = parse(
      `mensaje=intensive&cuando=%20este%20s%C3%A1bado&actividad=Acuarela&texto=hi&taller=${WORKSHOP}&mes=2026-10&turno=Martes&estado=paid`,
    );
    expect(request).toEqual({
      kind: "intensive",
      inputs: { when: "este sábado", activity: "Acuarela", text: "hi" },
      filter: {
        workshopId: WORKSHOP,
        period: "2026-10",
        turnoLabel: "Martes",
        status: "paid",
      },
    });
    expect(values).toEqual({
      mensaje: "intensive",
      cuando: "este sábado",
      actividad: "Acuarela",
      texto: "hi",
      taller: WORKSHOP,
      mes: "2026-10",
      turno: "Martes",
      estado: "paid",
    });
  });

  it("drops filters it does not understand so they widen the audience", () => {
    const { request, values } = parse(
      "mensaje=fee&taller=nope&mes=octubre&estado=zzz",
    );
    expect(request?.filter).toEqual({});
    expect(values).toMatchObject({ taller: "", mes: "", estado: "" });
  });

  it("keeps long free text for the service to refuse", () => {
    const { request } = parse(`mensaje=notice&texto=${"x".repeat(900)}`);
    expect(request?.inputs.text).toHaveLength(900);
  });
});
