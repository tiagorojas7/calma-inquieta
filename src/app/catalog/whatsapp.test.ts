import { describe, expect, it } from "vitest";
import { catalogContent } from "~/modules/site-content/infrastructure/content/catalog";
import { buildActivityWhatsAppUrl } from "./whatsapp";

const profile = {
  whatsappDisplay: "351 000 0000",
  instagramUrl: "https://www.instagram.com/calma.inquieta/",
};

function decodedText(href: string): string {
  return new URL(href).searchParams.get("text") ?? "";
}

describe("buildActivityWhatsAppUrl", () => {
  it("names the intensivo and its date in a wa.me link", () => {
    const link = buildActivityWhatsAppUrl({
      profile,
      content: catalogContent,
      message: {
        kind: "intensivo",
        name: "Intensivo Demo",
        date: "2026-11-14",
      },
    });
    expect(new URL(link.href).host).toBe("wa.me");
    expect(link.label).toBe("Consultá por WhatsApp");
    const text = decodedText(link.href);
    expect(text).toContain("Intensivo Demo");
    expect(text).toContain("14 de noviembre");
  });

  it("carries the weekday and the time range of a turno", () => {
    const link = buildActivityWhatsAppUrl({
      profile,
      content: catalogContent,
      message: {
        kind: "turno",
        name: "Taller Demo",
        weekday: 1,
        startsAt: "10:00",
        endsAt: "12:00",
      },
    });
    expect(decodedText(link.href)).toContain("lunes de 10:00 a 12:00 h");
  });

  it("encodes &, ?, # and a newline in the name safely", () => {
    const name = "A&B? C#D\nE";
    const link = buildActivityWhatsAppUrl({
      profile,
      content: catalogContent,
      message: { kind: "taller", name },
    });
    const url = new URL(link.href);
    expect(url.host).toBe("wa.me");
    expect(url.hash).toBe("");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(decodedText(link.href)).toContain(name);
  });

  it("names the activity in the paused message and uses the paused label", () => {
    const link = buildActivityWhatsAppUrl({
      profile,
      content: catalogContent,
      message: { kind: "paused", name: "Intensivo Demo" },
    });
    expect(decodedText(link.href)).toContain("Intensivo Demo");
    expect(link.label).toBe("Escribinos por WhatsApp");
  });

  it("falls back to Instagram when the number is invalid", () => {
    const link = buildActivityWhatsAppUrl({
      profile: { ...profile, whatsappDisplay: "123" },
      content: catalogContent,
      message: { kind: "taller", name: "Taller Demo" },
    });
    expect(link).toEqual({
      href: profile.instagramUrl,
      label: "Seguinos en Instagram",
    });
  });
});
