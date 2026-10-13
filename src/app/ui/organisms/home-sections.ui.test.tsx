import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  activityFixture,
  upcomingItemFixture,
  trustClaimFixtures,
} from "~/testing/fixtures/ui";
import { ActivityShowcase } from "./activity-showcase";
import { AboutTeaser } from "./about-teaser";
import { ContactBand } from "./contact-band";
import { TrustRow } from "./trust-row";
import { UpcomingList } from "./upcoming-list";

describe("home organisms", () => {
  it("renders TrustRow null for empty claims", async () => {
    const { container } = render(<TrustRow claims={[]} />);
    expect(container).toBeEmptyDOMElement();
    await expectNoAxeViolations(container);
  });

  it("renders one TrustItem per claim", async () => {
    const { container } = render(<TrustRow claims={trustClaimFixtures} />);
    expect(screen.getByText("Experiencias cuidadas")).toBeInTheDocument();
    expect(screen.getByText("Para crear en comunidad")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("renders ActivityShowcase empty state with its external action", async () => {
    const { container } = render(
      <ActivityShowcase
        items={[]}
        emptyAction={{
          href: "https://wa.me/5493510000000",
          label: "Escribinos por WhatsApp",
        }}
      />,
    );
    expect(
      screen.getByText("Pronto vamos a compartir nuevas propuestas."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(activityFixture.title)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Escribinos por WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/5493510000000");
    expect(
      screen.queryByRole("link", { name: "Escribinos" }),
    ).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("renders each ActivityShowcase card when populated", async () => {
    const { container } = render(
      <MemoryRouter>
        <ActivityShowcase
          items={[activityFixture]}
          emptyAction={{
            href: "https://wa.me/5493510000000",
            label: "Escribinos por WhatsApp",
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(activityFixture.title)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: activityFixture.ctaLabel }),
    ).toHaveAttribute("href", activityFixture.href);
    await expectNoAxeViolations(container);
  });

  it("renders UpcomingList empty state with its external action", async () => {
    const { container } = render(
      <UpcomingList
        items={[]}
        emptyAction={{
          href: "https://www.instagram.com/calma.inquieta/",
          label: "Seguinos en Instagram",
        }}
      />,
    );
    expect(
      screen.getByText("Pronto vamos a anunciar nuevas fechas."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByText(upcomingItemFixture.title),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Seguinos en Instagram" }),
    ).toHaveAttribute("href", "https://www.instagram.com/calma.inquieta/");
    expect(
      screen.queryByRole("link", { name: "Escribinos" }),
    ).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("renders each UpcomingList card when populated", async () => {
    const { container } = render(
      <MemoryRouter>
        <UpcomingList
          items={[upcomingItemFixture]}
          emptyAction={{
            href: "https://www.instagram.com/calma.inquieta/",
            label: "Seguinos en Instagram",
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(upcomingItemFixture.title)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: upcomingItemFixture.ctaLabel }),
    ).toHaveAttribute("href", upcomingItemFixture.href);
    await expectNoAxeViolations(container);
  });

  it("renders AboutTeaser content and link accessibly", async () => {
    const { container } = render(
      <MemoryRouter>
        <AboutTeaser heading="Quiénes somos" body="Creamos juntas." />
      </MemoryRouter>,
    );
    expect(screen.getByText("Creamos juntas.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Conocé quiénes somos" }),
    ).toHaveAttribute("href", "/quienes-somos");
    await expectNoAxeViolations(container);
  });

  it("renders ContactBand content and WhatsApp link accessibly", async () => {
    const { container } = render(
      <MemoryRouter>
        <ContactBand
          heading="Hablemos"
          body="Estamos para acompañarte."
          whatsappHref="https://wa.me/5493510000000"
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Hablemos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Estamos para acompañarte.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Escribinos por WhatsApp/ }),
    ).toHaveAttribute("href", "https://wa.me/5493510000000");
    await expectNoAxeViolations(container);
  });
});
