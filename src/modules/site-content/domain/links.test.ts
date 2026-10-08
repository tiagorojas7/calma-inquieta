import { describe, expect, it } from "vitest";
import {
  buildDirectionsUrl,
  buildWhatsAppUrl,
  instagramUrl,
  toWhatsAppDigits,
} from "./links";
import type { Address } from "./business-profile";

const ADDRESS: Address = {
  street: "Albert Sabin 6079",
  locality: "Argüello",
  city: "Córdoba",
  region: "Córdoba",
  countryCode: "AR",
};

describe("toWhatsAppDigits", () => {
  it("strips spaces and punctuation and adds the Argentine mobile prefix to 10 digits", () => {
    expect(toWhatsAppDigits("351 739 5239")).toEqual({
      ok: true,
      value: "5493517395239",
    });
    expect(toWhatsAppDigits("(351) 739-5239")).toEqual({
      ok: true,
      value: "5493517395239",
    });
  });

  it("keeps a 13 digit number that already starts with 549", () => {
    expect(toWhatsAppDigits("+54 9 351 739 5239")).toEqual({
      ok: true,
      value: "5493517395239",
    });
  });

  it("rejects a display with no digits", () => {
    expect(toWhatsAppDigits("sin número")).toEqual({
      ok: false,
      error: { kind: "invalid-number" },
    });
  });

  it.each(["351 739 523", "351 739 52399", "+54 351 739 5239 0"])(
    "rejects the unsupported length in %j",
    (display) => {
      expect(toWhatsAppDigits(display)).toEqual({
        ok: false,
        error: { kind: "invalid-number" },
      });
    },
  );

  it("rejects a 13 digit number that does not start with 549", () => {
    expect(toWhatsAppDigits("+1 234 567 8901 23")).toEqual({
      ok: false,
      error: { kind: "invalid-number" },
    });
  });
});

describe("buildWhatsAppUrl", () => {
  it("builds the wa.me link with the encoded message", () => {
    const result = buildWhatsAppUrl("351 739 5239", "Hola, quiero info");

    expect(result).toEqual({
      ok: true,
      value: `https://wa.me/5493517395239?text=${encodeURIComponent("Hola, quiero info")}`,
    });
  });

  it("percent-encodes spaces, accents, question marks, ampersands and hashes", () => {
    const message = "¿Cómo está el año? Pan & café #1";
    const result = buildWhatsAppUrl("351 739 5239", message);

    if (!result.ok) {
      return expect.unreachable("expected a url");
    }
    const text = result.value.split("?text=")[1] ?? "";
    expect(text).not.toMatch(/[ ?&#ñé]/);
    expect(decodeURIComponent(text)).toBe(message);
  });

  it("returns the error when the display has no digits", () => {
    expect(buildWhatsAppUrl("---", "Hola")).toEqual({
      ok: false,
      error: { kind: "invalid-number" },
    });
  });
});

describe("buildDirectionsUrl", () => {
  it("encodes the whole address as the destination", () => {
    expect(buildDirectionsUrl(ADDRESS)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent("Albert Sabin 6079, Argüello, Córdoba, Argentina"),
    );
  });

  it("follows the address it is given", () => {
    const url = buildDirectionsUrl({
      ...ADDRESS,
      street: "Otra Calle 12",
      locality: "Centro",
    });

    expect(decodeURIComponent(url.split("destination=")[1] ?? "")).toBe(
      "Otra Calle 12, Centro, Córdoba, Argentina",
    );
  });
});

describe("instagramUrl", () => {
  it("builds the profile url with a trailing slash", () => {
    expect(instagramUrl("calma.inquieta")).toBe(
      "https://www.instagram.com/calma.inquieta/",
    );
    expect(instagramUrl("otra_cuenta")).toBe(
      "https://www.instagram.com/otra_cuenta/",
    );
  });
});
