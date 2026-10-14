import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PausedNotice } from "./paused-notice";

describe("PausedNotice", () => {
  it("renders the text without a link", async () => {
    const { container } = render(
      <PausedNotice text="Las inscripciones están en pausa." />,
    );
    expect(
      screen.getByText("Las inscripciones están en pausa."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("renders the optional link", async () => {
    const { container } = render(
      <PausedNotice
        text="Las inscripciones están en pausa."
        link={{ href: "/contacto", label: "Consultanos" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Consultanos" })).toHaveAttribute(
      "href",
      "/contacto",
    );
    await expectNoAxeViolations(container);
  });
});
