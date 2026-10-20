import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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
  "cormorant-garamond-latin-500-normal.woff2",
  "cormorant-garamond-latin-600-normal.woff2",
  "caveat-latin-600-normal.woff2",
] as const;

const FONT_LICENCES = [
  { family: "Cormorant Garamond", file: "OFL-cormorant-garamond.txt" },
  { family: "Montserrat", file: "OFL-montserrat.txt" },
  { family: "Caveat", file: "OFL-caveat.txt" },
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

/** Every non-test .tsx file under dir, at any depth (the literal scan's tree). */
function listTsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (entry.endsWith(".tsx")) {
      // Test files hold deliberate bypass samples; only components are scanned.
      return entry.endsWith(".test.tsx") ? [] : [path];
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

  it("every font file and OFL licence exists on disk", () => {
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

    expect(webfontFaces.length).toBe(7);
    for (const face of webfontFaces) {
      expect(
        face.body,
        `${face.family} face is missing font-display: swap`,
      ).toMatch(/font-display:\s*swap/);
    }
  });

  it("declares Cormorant 500 and 600 and the Caveat 600 script face", () => {
    const faces = fontFaces(readStyles("fonts.css"));
    const has = (family: string, weight: string, file: string) =>
      faces.some(
        (face) =>
          face.family === family &&
          new RegExp(`font-weight:\\s*${weight}\\s*;`).test(face.body) &&
          face.body.includes(`url("/fonts/${file}")`),
      );

    expect(
      has(
        "Cormorant Garamond",
        "500",
        "cormorant-garamond-latin-500-normal.woff2",
      ),
    ).toBe(true);
    expect(
      has(
        "Cormorant Garamond",
        "600",
        "cormorant-garamond-latin-600-normal.woff2",
      ),
    ).toBe(true);
    expect(has("Caveat", "600", "caveat-latin-600-normal.woff2")).toBe(true);
  });

  it("wires the --font-script family token", () => {
    expect(readStyles("fonts.css")).toMatch(
      /--font-script:\s*"Caveat",[^;]*cursive;/,
    );
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

  it("the H1 is fluid from 2.75rem on phones to 5rem on wide screens", () => {
    const match = readStyles("tokens.css").match(
      /--text-display:\s*clamp\(\s*([0-9.]+)rem\s*,[^,]+,\s*([0-9.]+)rem\s*\)/,
    );

    expect(match, "--text-display is not a clamp() in rem").not.toBeNull();
    expect(parseFloat(match?.[1] ?? "0")).toBe(2.75);
    expect(parseFloat(match?.[2] ?? "0")).toBe(5);
  });

  it("the script accent token is never smaller than 1.5rem (24 px)", () => {
    const match = readStyles("tokens.css").match(
      /--text-script:\s*clamp\(\s*([0-9.]+)rem/,
    );

    expect(match, "--text-script is not a clamp() in rem").not.toBeNull();
    expect(parseFloat(match?.[1] ?? "0")).toBeGreaterThanOrEqual(1.5);
  });

  it("renders <em> inside headings as Cormorant italic in the accent colour", () => {
    const css = readStyles("app.css");

    expect(css).toMatch(/h1 em[\s\S]*font-style:\s*italic/);
    expect(css).toMatch(/--em-color/);
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

  it("the scan walks nested components but skips test files", () => {
    const root = mkdtempSync(join(tmpdir(), "literal-scan-"));
    try {
      mkdirSync(join(root, "atoms"));
      writeFileSync(join(root, "atoms", "Button.tsx"), "export {};");
      writeFileSync(join(root, "atoms", "Button.test.tsx"), "bg-[#fff]");

      expect(listTsxFiles(root)).toEqual([join(root, "atoms", "Button.tsx")]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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

interface CssBlock {
  readonly prelude: string;
  readonly body: string;
  readonly ancestors: readonly string[];
}

/** Every `{}` block of a stylesheet with the preludes of its enclosing blocks. */
function cssBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  const walk = (text: string, ancestors: string[]) => {
    let depth = 0;
    let start = 0;
    let prelude = "";
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "{") {
        if (depth === 0) {
          prelude = text.slice(start, i).trim();
          start = i + 1;
        }
        depth++;
      } else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          const body = text.slice(start, i);
          blocks.push({ prelude, body, ancestors });
          walk(body, [...ancestors, prelude]);
          start = i + 1;
        }
      }
    }
  };
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ""), []);
  return blocks;
}

const ANIMATION_DECLARATION = /(^|[\s;])animation(-[a-z-]+)?\s*:/;

describe("decorative motifs stylesheet", () => {
  const css = readStyles("motifs.css");
  const blocks = cssBlocks(css);

  it("every animation declaration in motifs.css sits inside a prefers-reduced-motion: no-preference block", () => {
    const declaring = blocks.filter(
      (block) =>
        !block.prelude.startsWith("@") &&
        ANIMATION_DECLARATION.test(block.body),
    );

    expect(declaring.length).toBeGreaterThan(0);
    for (const block of declaring) {
      expect(
        block.ancestors.some((a) =>
          /@media\s*\(prefers-reduced-motion:\s*no-preference\)/.test(a),
        ),
        `${block.prelude} declares an animation outside no-preference`,
      ).toBe(true);
    }
  });

  it("the cord draw-in is also inside @supports animation-timeline", () => {
    const timelines = blocks.filter(
      (block) =>
        !block.prelude.startsWith("@") &&
        /animation-timelines*:/.test(block.body),
    );

    expect(timelines.length).toBeGreaterThan(0);
    for (const block of timelines) {
      expect(
        block.ancestors.some((a) =>
          /@supports\s*\(animation-timeline:\s*view\(\)\)/.test(a),
        ),
        `${block.prelude} uses animation-timeline outside @supports`,
      ).toBe(true);
    }
  });

  it("only transform and opacity are animated", () => {
    // Stroke-dash is the third property design AD11 and the spec allow, for
    // the cord draw-in; no layout property is ever allowed.
    const allowed = new Set(["transform", "opacity", "stroke-dashoffset"]);
    const frames = blocks.filter((block) =>
      block.ancestors.some((a) => a.startsWith("@keyframes")),
    );

    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      for (const declaration of frame.body.split(";")) {
        const property = declaration.split(":")[0]?.trim();
        if (property) {
          expect(
            allowed.has(property),
            `${property} is animated in motifs.css`,
          ).toBe(true);
        }
      }
    }
  });

  it("app.css imports motifs.css", () => {
    expect(readStyles("app.css")).toMatch(/@import\s+"\.\/motifs\.css";/);
  });

  it("motifs.css holds no colour literal", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe("motion stylesheet", () => {
  const css = readStyles("motion.css");
  const blocks = cssBlocks(css);
  const inNoPreference = (block: CssBlock) =>
    block.ancestors.some((a) =>
      /@media\s*\(prefers-reduced-motion:\s*no-preference\)/.test(a),
    );

  it("every animation declaration in motion.css sits inside a prefers-reduced-motion: no-preference block", () => {
    const declaring = blocks.filter(
      (block) =>
        !block.prelude.startsWith("@") &&
        ANIMATION_DECLARATION.test(block.body),
    );

    expect(declaring.length).toBeGreaterThan(0);
    for (const block of declaring) {
      expect(
        inNoPreference(block),
        `${block.prelude} declares an animation outside no-preference`,
      ).toBe(true);
    }
  });

  it("every transition and view transition rule sits inside a no-preference block", () => {
    const moving = blocks.filter(
      (block) =>
        !block.prelude.startsWith("@") &&
        (/(^|[\s;])transition(-[a-z-]+)?\s*:/.test(block.body) ||
          block.prelude.includes("::view-transition")),
    );

    expect(moving.length).toBeGreaterThan(0);
    for (const block of moving) {
      expect(
        inNoPreference(block),
        `${block.prelude} moves outside no-preference`,
      ).toBe(true);
    }
  });

  it("only transform and opacity are animated in keyframes", () => {
    const allowed = new Set(["transform", "opacity"]);
    const frames = blocks.filter((block) =>
      block.ancestors.some((a) => a.startsWith("@keyframes")),
    );

    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      for (const declaration of frame.body.split(";")) {
        const property = declaration.split(":")[0]?.trim();
        if (property) {
          expect(
            allowed.has(property),
            `${property} is animated in motion.css`,
          ).toBe(true);
        }
      }
    }
  });

  it("the route cross-fade lasts between 250 and 300 ms", () => {
    const match = css.match(
      /::view-transition-(?:old|new)\(root\)[^{]*\{[^}]*animation-duration:\s*(\d+)ms/,
    );

    expect(match, "no root view-transition duration").not.toBeNull();
    const ms = parseInt(match?.[1] ?? "0", 10);
    expect(ms).toBeGreaterThanOrEqual(250);
    expect(ms).toBeLessThanOrEqual(300);
  });

  it("hides revealable content only after mount, never in the stylesheet default", () => {
    const hidden = blocks.find((block) =>
      block.prelude.includes('[data-reveal="hidden"]'),
    );

    expect(hidden, "no [data-reveal=hidden] rule").toBeDefined();
    expect(hidden ? inNoPreference(hidden) : false).toBe(true);
    const rules = blocks.filter(
      (b) =>
        !b.prelude.startsWith("@") &&
        !b.ancestors.some((a) => a.startsWith("@keyframes")),
    );
    for (const block of rules) {
      if (!block.prelude.includes('[data-reveal="hidden"]')) {
        expect(block.body, block.prelude).not.toMatch(/opacity:\s*0\s*;/);
      }
    }
  });

  it("app.css imports motion.css and layout.css", () => {
    const app = readStyles("app.css");

    expect(app).toMatch(/@import\s+"\.\/motion\.css";/);
    expect(app).toMatch(/@import\s+"\.\/layout\.css";/);
  });

  it("motion.css holds no colour literal", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe("layout stylesheet", () => {
  const css = readStyles("layout.css");

  it("the bleed band is as wide as the viewport and centred on its container", () => {
    expect(css).toMatch(/\.section-bleed\s*\{[^}]*width:\s*100vw/);
    expect(css).toMatch(
      /\.section-bleed\s*\{[^}]*margin-inline:\s*calc\(50% - 50vw\)/,
    );
  });

  it("app.css clips the horizontal overshoot of full-bleed bands", () => {
    expect(readStyles("app.css")).toMatch(/html\s*\{[^}]*overflow-x:\s*clip/);
  });

  it("the paper grain is an inline SVG data URI of at most 2 KB", () => {
    const uri = css.match(
      /\.paper-grain[^}]*url\("(data:image\/svg\+xml[^"]+)"\)/,
    );

    expect(uri, "no .paper-grain data URI").not.toBeNull();
    expect(Buffer.byteLength(uri?.[1] ?? "", "utf-8")).toBeLessThanOrEqual(
      2048,
    );
  });
});

describe("hero collage stylesheet", () => {
  const css = readStyles("motifs.css");
  const blocks = cssBlocks(css);
  const rule = (selector: string, ancestor?: RegExp) =>
    blocks.find(
      (block) =>
        block.prelude
          .split(",")
          .map((part) => part.trim())
          .includes(selector) &&
        (ancestor
          ? block.ancestors.some((a) => ancestor.test(a))
          : block.ancestors.length === 0),
    );
  const fromLg = /@media\s*\(min-width:\s*64rem\)/;

  it("tears paper and photo edges with a clip-path polygon", () => {
    for (const selector of [".photo-torn", ".paper-torn"]) {
      expect(rule(selector)?.body, selector).toMatch(
        /clip-path:\s*polygon\([^)]{80,}\)/,
      );
    }
  });

  it("the phone band slides under the sticky header and fills the first viewport", () => {
    const stage = rule(".hero-stage")?.body ?? "";

    expect(css).toMatch(/--hero-header:\s*[0-9.]+rem/);
    expect(stage).toMatch(/margin-top:\s*calc\(var\(--hero-header\) \* -1\)/);
    expect(stage).toMatch(/padding-top:\s*var\(--hero-header\)/);
    expect(stage).toMatch(/min-height:\s*100svh/);
  });

  it("the hero fills the viewport on phones and desktop, with a vh fallback before svh", () => {
    const phone = rule(".hero-stage")?.body ?? "";
    const desktop = rule(".hero-stage", fromLg)?.body ?? "";
    const heights = [...phone.matchAll(/min-height:\s*([^;]+);/g)].map(
      (match) => match[1],
    );

    expect(heights).toEqual(["100vh", "100svh"]);
    // From lg the band keeps the phone height and its slide under the header.
    expect(desktop).not.toMatch(/min-height:/);
    expect(desktop).not.toMatch(/margin-top:/);
    expect(desktop).not.toMatch(/padding-top:/);
  });

  it("the scrim is a dark warm gradient from the tokens, at least 80 % opaque over the text", () => {
    const body = rule(".hero-scrim")?.body ?? "";
    const opacities = [
      ...body.matchAll(/var\(--color-ink-900\)\s*(\d+)%,[^)]*\)\s*(\d+)%/g),
    ].map((match) => Number(match[1]));

    expect(body).toMatch(/linear-gradient\(\s*to bottom/);
    expect(body).toMatch(/color-mix\(/);
    expect(body).not.toMatch(/var\(--color-canvas\)\s*\d+%,\s*transparent/);
    expect(opacities.length).toBeGreaterThanOrEqual(3);
    expect(opacities[0]).toBeGreaterThanOrEqual(80);
  });

  const phoneOnly = /@media\s*\(max-width:\s*63\.99rem\)/;

  it("below lg the copy is cream on the scrim with a light terracotta accent", () => {
    const copy = rule(".hero-copy", phoneOnly)?.body ?? "";
    const text =
      blocks.find(
        (block) =>
          block.prelude.includes(".hero-copy") &&
          block.prelude.includes("h1") &&
          block.ancestors.some((a) => phoneOnly.test(a)),
      )?.body ?? "";

    expect(copy).toMatch(/--em-color:\s*color-mix\(/);
    expect(copy).toMatch(/--em-color:[^;]*var\(--color-terracotta-700\)/);
    expect(text).toMatch(/color:\s*var\(--color-canvas\)/);
  });

  it("below lg the calls to action and the subtitle are restyled for the dark ground", () => {
    for (const selector of [
      ".hero-copy .hero-cta-primary",
      ".hero-copy .hero-cta-outline",
      ".hero-copy .hero-subtitle",
    ]) {
      expect(rule(selector, phoneOnly)?.body, selector).toBeTruthy();
    }
    expect(rule(".hero-copy .hero-cta-primary", phoneOnly)?.body).toMatch(
      /background-color:\s*var\(--color-canvas\)/,
    );
    expect(rule(".hero-copy .hero-subtitle", phoneOnly)?.body).toMatch(
      /backdrop-filter:\s*blur\(/,
    );
  });

  it("the collage board and its tiles exist only from lg", () => {
    for (const selector of [
      ".hero-collage",
      ".collage-lead",
      ".collage-torn",
      ".collage-framed",
      ".collage-loop",
      ".hero-keywords",
    ]) {
      expect(rule(selector), selector).toBeUndefined();
      expect(rule(selector, fromLg)?.body, selector).toMatch(
        /position:\s*absolute/,
      );
    }
  });

  it("the lead bleeds past the right edge of the board", () => {
    expect(rule(".collage-lead", fromLg)?.body).toMatch(/right:\s*-\d+%/);
  });

  it("the torn photo keeps its shadow on the wrapper, not on the clipped element", () => {
    expect(rule(".collage-torn", fromLg)?.body).toMatch(/drop-shadow\(/);
    expect(rule(".photo-torn")?.body).not.toMatch(/shadow/);
  });
});

describe("brand stylesheet (T6)", () => {
  const css = readStyles("layout.css");
  const section = css.slice(css.indexOf("/* T6 brand */"));
  const blocks = cssBlocks(section);
  const belowLg = /@media\s*\(max-width:\s*63\.999rem\)/;
  const darkTop =
    '.site-header[data-backdrop="dark-below-lg"][data-solid="false"]';
  const rule = (selector: string, ancestor?: RegExp) =>
    blocks.find(
      (block) =>
        block.prelude
          .split(",")
          .map((part) => part.trim().replace(/\s+/g, " "))
          .includes(selector) &&
        (ancestor
          ? block.ancestors.some((a) => ancestor.test(a))
          : block.ancestors.length === 0),
    );

  it("starts with the T6 marker so the parent can merge the section", () => {
    expect(css).toContain("/* T6 brand */");
    expect(blocks.length).toBeGreaterThan(5);
  });

  it("keeps the header at 44 px of content with the dark logo as the default ink", () => {
    expect(rule(".brand-logo-img")?.body).toMatch(/height:\s*2\.75rem/);
    expect(rule('.brand-logo-img[data-ink="light"]')?.body).toMatch(
      /display:\s*none/,
    );
  });

  it("swaps to the light logo and light ink only over the dark hero below lg", () => {
    expect(rule(darkTop, belowLg)?.body).toMatch(
      /color:\s*var\(--color-canvas\)/,
    );
    expect(
      rule(`${darkTop} .brand-logo-img[data-ink="dark"]`, belowLg)?.body,
    ).toMatch(/display:\s*none/);
    expect(
      rule(`${darkTop} .brand-logo-img[data-ink="light"]`, belowLg)?.body,
    ).toMatch(/display:\s*block/);
    // From lg the hero is light: nothing in the swap sits outside the media query.
    for (const block of blocks) {
      if (block.prelude.includes("data-backdrop")) {
        expect(
          block.ancestors.some((a) => belowLg.test(a)),
          block.prelude,
        ).toBe(true);
      }
    }
  });

  it("lays the footer out in a grid that goes three-column from lg", () => {
    expect(rule(".site-footer-grid")?.body).toMatch(/display:\s*grid/);
    expect(
      rule(".site-footer-grid", /@media\s*\(min-width:\s*64rem\)/)?.body,
    ).toMatch(/grid-template-columns/);
  });

  it("holds no colour literal", () => {
    expect(section).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
  });

  it("tilts the monogram on hover only inside a no-preference block", () => {
    const motion = cssBlocks(readStyles("motion.css"));
    const hover = motion.find((block) =>
      block.prelude.includes(".brand-link:hover .brand-logo"),
    );

    expect(hover?.body).toMatch(/transform:\s*rotate\(/);
    expect(
      hover?.ancestors.some((a) =>
        /@media\s*\(prefers-reduced-motion:\s*no-preference\)/.test(a),
      ),
    ).toBe(true);
  });
});

describe("T7 home stylesheet", () => {
  const css = readStyles("motifs.css");
  const blocks = cssBlocks(css);
  const rule = (selector: string, ancestor?: RegExp) =>
    blocks.find(
      (block) =>
        block.prelude
          .split(",")
          .map((part) => part.trim())
          .includes(selector) &&
        (ancestor
          ? block.ancestors.some((a) => ancestor.test(a))
          : block.ancestors.length === 0),
    );
  const noPreference = /@media\s*\(prefers-reduced-motion:\s*no-preference\)/;

  it("keeps the T7 rules under their own heading", () => {
    expect(css).toMatch(/\/\*\s*T7 home\b/);
  });

  it("the layered photo pair reserves its boxes and puts the shadow on the frame", () => {
    for (const selector of [".photo-pair", ".photo-pair-a", ".photo-pair-b"]) {
      expect(rule(selector)?.body, selector).toBeTruthy();
    }
    expect(rule(".photo-pair-b")?.body).toMatch(/position:\s*absolute/);
    expect(rule(".photo-pair-a")?.body).toMatch(/box-shadow:/);
  });

  it("photo hover motion is transform only and only when motion is allowed", () => {
    const hover = blocks.filter(
      (block) =>
        block.prelude.includes(".photo-pair") &&
        block.prelude.includes(":hover"),
    );

    expect(hover.length).toBeGreaterThan(0);
    for (const block of hover) {
      expect(block.ancestors.some((a) => noPreference.test(a))).toBe(true);
      expect(block.body).toMatch(/transform:/);
      expect(block.body).not.toMatch(/\b(width|height|top|left|margin)\s*:/);
    }
  });

  it("the paper note has a tape strip and a light sheet from the tokens", () => {
    expect(rule(".paper-note::before")?.body).toMatch(/content:/);
    expect(rule(".paper-note-sheet")?.body).toMatch(/var\(--color-sand-/);
  });
});
