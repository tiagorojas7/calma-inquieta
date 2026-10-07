import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const STYLES_DIR = new URL("./styles/", import.meta.url);
const UI_DIR = new URL("./", import.meta.url);
const FONTS_DIR = new URL("../../../public/fonts/", import.meta.url);

// Fixed by design §3.3 and the B2 stand-in manifest rows.
const WEBFONT_FILES = [
  "cormorant-garamond-latin-400-normal.woff2",
  "cormorant-garamond-latin-400-italic.woff2",
  "montserrat-latin-400-normal.woff2",
  "montserrat-latin-600-normal.woff2",
] as const;

const FONT_LICENCES = [
  { family: "Cormorant Garamond", file: "OFL-cormorant-garamond.txt" },
  { family: "Montserrat", file: "OFL-montserrat.txt" },
] as const;

// Design §3.3 static checks: no literal that bypasses the tokens.
const ARBITRARY_COLOR = /\[#[0-9a-f]{3,8}\]/i;
const HEX_STRING_LITERAL = /["'`]#[0-9a-f]{3,8}["'`]/i;
const ARBITRARY_LENGTH = /-\[-?\d*\.?\d+(px|rem|em|%|vh|vw|svh|dvh|ch)\]/;

/** Every @font-face block with its family name and raw descriptor body. */
function fontFaces(css: string): { family: string; body: string }[] {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
    .map((match) => {
      const body = match[1];
      if (body === undefined) {
        return null;
      }
      const family = body.match(/font-family:\s*"?([^;"\n]+?)"?\s*;/)?.[1];
      return family === undefined ? null : { family: family.trim(), body };
    })
    .filter((face): face is { family: string; body: string } => face !== null);
}

/** Every .tsx file under dir, at any depth (the literal scan's real tree). */
function listTsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (entry.endsWith(".tsx")) {
      return [path];
    }
    return statSync(path).isDirectory() ? listTsxFiles(path) : [];
  });
}

const readStyles = (file: string) =>
  readFileSync(join(fileURLToPath(STYLES_DIR), file), "utf-8");

describe("self-hosted fonts", () => {
  it("every url() in fonts.css points at /fonts/", () => {
    const css = readStyles("fonts.css");
    const urls = [...css.matchAll(/url\(\s*([^)]+?)\s*\)/g)].map(
      (match) => match[1]?.replace(/^["']|["']$/g, "") ?? "",
    );

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(
        url,
        `url() target ${url} in fonts.css is not a same-origin /fonts/ path`,
      ).toMatch(/^\/fonts\//);
    }
  });

  it("the four font files and both OFL licences exist on disk", () => {
    for (const file of WEBFONT_FILES) {
      expect(
        existsSync(join(fileURLToPath(FONTS_DIR), file)),
        `missing font file ${file}`,
      ).toBe(true);
    }
    for (const licence of FONT_LICENCES) {
      expect(
        existsSync(join(fileURLToPath(FONTS_DIR), licence.file)),
        `missing OFL licence ${licence.file}`,
      ).toBe(true);
    }
  });

  it("each stand-in family has an OFL licence and a declared face", () => {
    const faces = fontFaces(readStyles("fonts.css"));
    for (const licence of FONT_LICENCES) {
      expect(
        faces.some((face) => face.family === licence.family),
        `no @font-face for family ${licence.family}`,
      ).toBe(true);
      expect(
        existsSync(join(fileURLToPath(FONTS_DIR), licence.file)),
        `missing OFL licence for ${licence.file}`,
      ).toBe(true);
    }
  });

  it("each webfont face swaps in with font-display: swap", () => {
    const webfontFaces = fontFaces(readStyles("fonts.css")).filter((face) =>
      face.body.includes("url("),
    );

    expect(webfontFaces.length).toBe(4);
    for (const face of webfontFaces) {
      expect(
        face.body,
        `${face.family} face is missing font-display: swap`,
      ).toMatch(/font-display:\s*swap/);
    }
  });

  it("metric fallback faces carry all four override descriptors", () => {
    const fallbacks = fontFaces(readStyles("fonts.css")).filter((face) =>
      face.family.endsWith("Fallback"),
    );

    expect(fallbacks.map((face) => face.family).sort()).toEqual([
      "Cormorant Fallback",
      "Montserrat Fallback",
    ]);
    for (const face of fallbacks) {
      for (const descriptor of [
        "size-adjust",
        "ascent-override",
        "descent-override",
        "line-gap-override",
      ]) {
        expect(face.body, `${face.family} is missing ${descriptor}`).toContain(
          descriptor,
        );
      }
    }
  });
});

describe("global base styles", () => {
  it("body text is never smaller than 1rem", () => {
    const match = readStyles("tokens.css").match(/--text-base:\s*([0-9.]+)rem/);

    expect(match, "--text-base is not a fixed rem value").not.toBeNull();
    expect(parseFloat(match?.[1] ?? "0")).toBeGreaterThanOrEqual(1);
  });

  it("app.css ships the accessibility baseline rules", () => {
    const css = readStyles("app.css");

    expect(css, "app.css is missing the reduced-motion rule").toMatch(
      /prefers-reduced-motion/,
    );
    expect(css, "app.css is missing the focus-visible rule").toMatch(
      /:focus-visible/,
    );
  });
});

describe("token literal scan", () => {
  it("the literal rules flag every bypass sample", () => {
    expect(ARBITRARY_COLOR.test('className="bg-[#fff]"')).toBe(true);
    expect(HEX_STRING_LITERAL.test('"#abc123"')).toBe(true);
    expect(ARBITRARY_LENGTH.test("w-[10px]")).toBe(true);
  });

  it("the literal rules ignore attribute variants", () => {
    const attributeVariant = "max-lg:data-[state=closed]:hidden";

    expect(ARBITRARY_COLOR.test(attributeVariant)).toBe(false);
    expect(HEX_STRING_LITERAL.test(attributeVariant)).toBe(false);
    expect(ARBITRARY_LENGTH.test(attributeVariant)).toBe(false);
  });

  it("no src/app/ui component bypasses the tokens", () => {
    const violations: string[] = [];
    for (const file of listTsxFiles(fileURLToPath(UI_DIR))) {
      const content = readFileSync(file, "utf-8");
      for (const [rule, pattern] of [
        ["arbitrary color", ARBITRARY_COLOR],
        ["hex string literal", HEX_STRING_LITERAL],
        ["arbitrary length", ARBITRARY_LENGTH],
      ] as const) {
        if (pattern.test(content)) {
          violations.push(`${file}: ${rule}`);
        }
      }
    }
    expect(violations, "token bypasses in src/app/ui components").toEqual([]);
  });
});
