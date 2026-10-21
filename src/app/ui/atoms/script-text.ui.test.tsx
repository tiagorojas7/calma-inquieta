import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { contrastRatio, parseColorTokens } from "../tokens/contrast";
import { ScriptText } from "./script-text";

const tokens = parseColorTokens(
  readFileSync(join(process.cwd(), "src/app/ui/styles/tokens.css"), "utf-8"),
);
const color = (name: string) => tokens.get(name) ?? `missing ${name}`;

describe("ScriptText", () => {
  it("sets the handwritten accent face at the 24 px minimum scale", () => {
    render(<ScriptText>Con calma</ScriptText>);

    const note = screen.getByText("Con calma");
    expect(note.tagName).toBe("SPAN");
    expect(note).toHaveClass("font-script", "text-script", "font-semibold");
    expect(note).toHaveAttribute("data-script", "true");
  });

  it("renders as a paragraph or a block when asked", () => {
    render(
      <>
        <ScriptText as="p">Nota</ScriptText>
        <ScriptText as="div">Bloque</ScriptText>
      </>,
    );

    expect(screen.getByText("Nota").tagName).toBe("P");
    expect(screen.getByText("Bloque").tagName).toBe("DIV");
  });

  it.each([
    ["accent", "text-terracotta-700"],
    ["ink", "text-ink-900"],
    ["light", "text-canvas"],
  ] as const)("maps tone %s to %s", (tone, token) => {
    render(<ScriptText tone={tone}>Texto</ScriptText>);

    expect(screen.getByText("Texto")).toHaveClass(token);
  });

  it("defaults to the accent tone and merges a className", () => {
    render(<ScriptText className="rotate-1">Texto</ScriptText>);

    expect(screen.getByText("Texto")).toHaveClass(
      "text-terracotta-700",
      "rotate-1",
    );
  });

  it("keeps AA contrast on every background it is meant for", () => {
    const pairs: [string, string][] = [
      ["terracotta-700", "canvas"],
      ["terracotta-700", "surface"],
      ["terracotta-700", "sand-200"],
      ["ink-900", "sand-100"],
      ["canvas", "clay-800"],
    ];
    for (const [fg, bg] of pairs) {
      expect(
        contrastRatio(color(fg), color(bg)),
        `${fg} on ${bg}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has no axe violations", async () => {
    const { container } = render(<ScriptText as="p">Con calma</ScriptText>);

    await expectNoAxeViolations(container);
  });
});
