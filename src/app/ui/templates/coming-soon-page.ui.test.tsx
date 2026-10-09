import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ComingSoonPage } from "./coming-soon-page";

describe("ComingSoonPage", () => {
  it("renders the coming-soon content and accessible external CTAs", async () => {
    const { container } = render(
      <main>
        <ComingSoonPage
          title="Talleres"
          message="Estamos preparando nuevas propuestas para vos."
          whatsappHref="https://wa.me/5493517395239"
          instagramHref="https://www.instagram.com/calma.inquieta/"
        />
      </main>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Talleres",
    );
    expect(
      screen.getByText("Estamos preparando nuevas propuestas para vos."),
    ).toBeInTheDocument();
    for (const name of [/^WhatsApp/, /^Instagram/]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    await expectNoAxeViolations(container, { page: true });
  });
});
