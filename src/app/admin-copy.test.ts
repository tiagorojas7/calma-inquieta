import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findCopyViolations } from "~/modules/site-content";
import { PUBLIC_PAGES } from "./site-map";
import { ADMIN_NAV } from "./ui/admin/admin-nav";
import { adminCopy } from "./ui/admin/copy";
import { adminMicrocopy } from "./ui/admin/microcopy";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function")
    return strings((value as (arg: string) => unknown)("agus@example.com"));
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

const SECTIONS = ["hoy", "alumnas", "clases", "materiales", "ajustes"] as const;

describe("admin copy and discovery rules", () => {
  it("keeps admin microcopy and menu labels in voseo Spanish", () => {
    const scanned = [
      ...strings(adminMicrocopy),
      ...ADMIN_NAV.map((entry) => entry.label),
    ];
    expect(scanned).toContain("No tenés acceso al panel");
    expect(findCopyViolations(scanned)).toEqual([]);
  });

  it("keeps the per-section copy in the same voseo Spanish", () => {
    const scanned = strings(adminCopy);
    expect(scanned).toContain("Más opciones");
    expect(scanned).toContain("Ajustes");
    expect(findCopyViolations(scanned)).toEqual([]);
  });

  it("has one copy module per section, all reachable from the index", () => {
    const files = readdirSync(new URL("./ui/admin/copy/", import.meta.url))
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => name.replace(/\.ts$/, ""))
      .filter((name) => name !== "index")
      .sort();
    expect(files).toEqual([...SECTIONS, "common"].sort());
    for (const section of SECTIONS)
      expect(strings(adminCopy[section]).length).toBeGreaterThan(0);
  });

  it("names the five sections exactly as the menu shows them", () => {
    expect(SECTIONS.map((section) => adminCopy[section].nav.label)).toEqual(
      ADMIN_NAV.map((entry) => entry.label),
    );
    expect(ADMIN_NAV.map((entry) => entry.label)).toEqual([
      "Hoy",
      "Alumnas",
      "Clases",
      "Materiales",
      "Ajustes",
    ]);
  });

  it("keeps admin paths out of the public site map", () => {
    expect(
      PUBLIC_PAGES.filter((page) => page.path.startsWith("/admin")),
    ).toEqual([]);
  });
});
