import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = "src/app/ui";

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(css|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [path]
      : [];
  });
}

/** The underline technique paints a solid line with a one-colour "gradient". */
const SOLID_UNDERLINE =
  /linear-gradient\(\s*currentColor\s*,\s*currentColor\s*\)/g;

describe("no colour gradients in the public UI", () => {
  const files = sources(ROOT);

  it("no stylesheet or component declares a colour gradient", () => {
    const offenders = files.filter((file) => {
      const text = readFileSync(file, "utf8").replace(SOLID_UNDERLINE, "");
      return /(linear|radial|conic)-gradient\(|bg-(linear|radial|conic|gradient)/.test(
        text,
      );
    });

    expect(offenders).toEqual([]);
  });

  it("the glow class and the paper sheen are gone", () => {
    const offenders = files.filter((file) =>
      /band-glow|paper-note-sheet/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
