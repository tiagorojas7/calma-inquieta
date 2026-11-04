import { describe, expect, it } from "vitest";
import { intensiveRequestCopy, requestFailureMessages } from "./copy";

function textsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Object.values(value as object).flatMap(textsOf);
}

const everyText = textsOf({
  intensiveRequestCopy,
  requestFailureMessages,
}).join(" ");

describe("the seat request copy", () => {
  it("calls the one-day event a workshop, never an intensivo", () => {
    expect(everyText).not.toMatch(/\bintensivos?\b/i);
    expect(requestFailureMessages["duplicate-request"]).toContain(
      "para este workshop",
    );
  });

  it("does not ask anyone to book through WhatsApp", () => {
    expect(intensiveRequestCopy.summary.cancelled).not.toMatch(
      /escrib|whatsapp/i,
    );
    expect(intensiveRequestCopy.summary.whatsapp).toBe(
      "Enviar resumen por WhatsApp",
    );
  });
});
