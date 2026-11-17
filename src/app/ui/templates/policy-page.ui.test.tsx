import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PolicyPage } from "./policy-page";

describe("PolicyPage", () => {
  it("shows the title, the version line and one paragraph per block", async () => {
    const { container } = render(
      <PolicyPage
        title="Condiciones"
        versionLine="Versión 2 · publicada el 17/11/2026"
        paragraphs={["Primero.", "Segundo."]}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Condiciones" }),
    ).toBeVisible();
    expect(
      screen.getByText("Versión 2 · publicada el 17/11/2026"),
    ).toBeVisible();
    expect(container.querySelectorAll("main p")).toHaveLength(3);
    expect(screen.getByText("Primero.")).toBeVisible();
    expect(screen.getByText("Segundo.")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("renders the text as plain text, never as markup", () => {
    const { container } = render(
      <PolicyPage
        title="Privacidad"
        versionLine="Versión 1 · publicada el 01/11/2026"
        paragraphs={['<img src=x onerror="alert(1)"> <b>negrita</b>']}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText(/<b>negrita<\/b>/)).toBeVisible();
  });
});
