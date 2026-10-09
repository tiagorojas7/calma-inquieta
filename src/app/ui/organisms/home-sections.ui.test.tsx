import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  activityFixture,
  upcomingItemFixture,
  trustClaimFixtures,
} from "~/testing/fixtures/ui";
import { TrustRow } from "./trust-row";
import { ActivityShowcase } from "./activity-showcase";
import { UpcomingList } from "./upcoming-list";
import { AboutTeaser } from "./about-teaser";
import { ContactBand } from "./contact-band";
describe("home organisms", () => {
  it("renders empty and populated states accessibly", async () => {
    const { container } = render(
      <MemoryRouter>
        <>
          <TrustRow claims={[]} />
          <TrustRow claims={trustClaimFixtures} />
          <ActivityShowcase items={[]} />
          <ActivityShowcase items={[activityFixture]} />
          <UpcomingList items={[]} />
          <UpcomingList items={[upcomingItemFixture]} />
          <AboutTeaser heading="Quiénes somos" body="Creamos juntas." />
          <ContactBand
            heading="Hablemos"
            body="Estamos para acompañarte."
            whatsappHref="https://wa.me/5493510000000"
          />
        </>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("heading").length).toBeGreaterThanOrEqual(6);
    expect(
      screen.getByRole("link", { name: "Conocé quiénes somos" }),
    ).toHaveAttribute("href", "/quienes-somos");
    expect(
      screen.getByRole("link", { name: /Escribinos por WhatsApp/ }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
