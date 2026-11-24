import { describe, expect, it } from "vitest";
import {
  RETURN_ANCHOR_FIELD,
  RETURN_TO_FIELD,
  safeAnchor,
  safeReturnTo,
  stayOnPage,
} from "./return-to";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("field names", () => {
  it("are the ones the forms post", () => {
    expect(RETURN_TO_FIELD).toBe("returnTo");
    expect(RETURN_ANCHOR_FIELD).toBe("anchor");
  });
});

describe("safeReturnTo", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/alumnas", "/admin/alumnas"],
    ["/admin/alumnas?q=ana", "/admin/alumnas?q=ana"],
    [
      "/admin/talleres/w1/periodos/2026-11",
      "/admin/talleres/w1/periodos/2026-11",
    ],
  ])("keeps the panel path %s", (value, expected) => {
    expect(safeReturnTo(value, "/admin/fallback")).toBe(expected);
  });

  it.each([
    ["an absolute url", "https://evil.example/admin"],
    ["a protocol-relative url", "//evil.example/admin"],
    ["a protocol-relative url that looks like a path", "/\\evil.example"],
    ["a backslash path", "/admin\\..\\evil"],
    ["a path outside the panel", "/sin-acceso"],
    ["the public site", "/"],
    ["a look-alike prefix", "/administrador"],
    ["a javascript url", "javascript:alert(1)"],
    ["a relative path", "admin/alumnas"],
    ["a path that climbs out of the panel", "/admin/../secreto"],
    ["an encoded climb out of the panel", "/admin/%2e%2e/secreto"],
    ["a control character", "/admin/alumnas\n/x"],
    ["an empty value", ""],
  ])("falls back for %s", (_name, value) => {
    expect(safeReturnTo(value, "/admin/fallback")).toBe("/admin/fallback");
  });

  it("falls back when the value is not text", () => {
    expect(safeReturnTo(null, "/admin/fallback")).toBe("/admin/fallback");
    expect(safeReturnTo(new File([""], "x.txt"), "/admin/fallback")).toBe(
      "/admin/fallback",
    );
  });

  it("drops a saved-message code and an anchor already on the page", () => {
    expect(safeReturnTo("/admin/alumnas?q=ana&ok=cobrado#a1", "/admin")).toBe(
      "/admin/alumnas?q=ana",
    );
  });
});

describe("safeAnchor", () => {
  it("accepts a plain element id", () => {
    expect(safeAnchor("inscripcion-123_a")).toBe("inscripcion-123_a");
  });

  it.each(["", "a b", "#x", "x#y", "1abc", "<script>", "a".repeat(80)])(
    "rejects %j",
    (value) => {
      expect(safeAnchor(value)).toBeNull();
    },
  );

  it("rejects what is not text", () => {
    expect(safeAnchor(null)).toBeNull();
  });
});

describe("stayOnPage", () => {
  it("goes back to the page the form was on, with the code and the item", () => {
    expect(
      stayOnPage(
        form({ returnTo: "/admin/alumnas?q=ana", anchor: "inscripcion-9" }),
        { fallback: "/admin/alumnas", code: "cobrado" },
      ),
    ).toBe("/admin/alumnas?q=ana&ok=cobrado#inscripcion-9");
  });

  it("starts the query when the page has none", () => {
    expect(
      stayOnPage(form({ returnTo: "/admin/clases" }), {
        fallback: "/admin",
        code: "abierto",
      }),
    ).toBe("/admin/clases?ok=abierto");
  });

  it("uses the fallback when the form does not say where it was", () => {
    expect(
      stayOnPage(form({}), { fallback: "/admin/alumnas", code: "cobrado" }),
    ).toBe("/admin/alumnas?ok=cobrado");
  });

  it("never leaves the panel: a foreign returnTo goes to the fallback", () => {
    expect(
      stayOnPage(
        form({ returnTo: "https://evil.example/admin", anchor: "a1" }),
        { fallback: "/admin/alumnas", code: "cobrado" },
      ),
    ).toBe("/admin/alumnas?ok=cobrado#a1");
    expect(
      stayOnPage(form({ returnTo: "//evil.example" }), {
        fallback: "/admin/alumnas",
        code: "cobrado",
      }),
    ).toBe("/admin/alumnas?ok=cobrado");
  });

  it("drops a malformed anchor but keeps the page", () => {
    expect(
      stayOnPage(form({ returnTo: "/admin/clases", anchor: "x y" }), {
        fallback: "/admin",
        code: "abierto",
      }),
    ).toBe("/admin/clases?ok=abierto");
  });

  it("builds the same address from URLSearchParams", () => {
    expect(
      stayOnPage(new URLSearchParams({ returnTo: "/admin/clases" }), {
        fallback: "/admin",
        code: "abierto",
      }),
    ).toBe("/admin/clases?ok=abierto");
  });

  it("keeps a failure on the same page too, without a code", () => {
    expect(
      stayOnPage(form({ returnTo: "/admin/clases", anchor: "t1" }), {
        fallback: "/admin",
      }),
    ).toBe("/admin/clases#t1");
  });
});
