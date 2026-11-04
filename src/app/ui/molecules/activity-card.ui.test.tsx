import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { activityFixture } from "~/testing/fixtures/ui";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ActivityCard } from "./activity-card";

const renderCard = (props: Partial<Parameters<typeof ActivityCard>[0]> = {}) =>
  render(
    <MemoryRouter>
      <ActivityCard {...activityFixture} {...props} />
    </MemoryRouter>,
  );

describe("ActivityCard extensions", () => {
  it("shows the schedule line and the badge when given", async () => {
    const { container } = renderCard({
      schedule: "Lunes de 10:00 a 12:00 h",
      badge: "Inscripciones pausadas",
    });
    expect(screen.getByText("Lunes de 10:00 a 12:00 h")).toBeVisible();
    expect(screen.getByText("Inscripciones pausadas")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: activityFixture.title }),
    ).toBeVisible();
    expect(screen.getByRole("article")).toHaveClass("card-hover", "h-full");
    expect(screen.getByRole("img").parentElement).toHaveClass(
      "card-hover-frame",
    );
    expect(
      screen.getByRole("link", { name: activityFixture.ctaLabel }),
    ).toHaveClass("mt-auto");
    await expectNoAxeViolations(container);
  });

  it("raises a liquid-glass panel over the lower edge of the photo", () => {
    renderCard();
    const card = screen.getByRole("article");
    const panel = screen
      .getByRole("heading", { name: activityFixture.title })
      .closest(".glass");

    expect(panel).not.toBeNull();
    expect(panel).toHaveClass("-mt-10", "rounded-md");
    expect(card).toContainElement(panel as HTMLElement);
    expect(card).not.toHaveClass("bg-cocoa-900");
  });

  it("closes with a solid full-width button instead of a text link", () => {
    renderCard();
    const cta = screen.getByRole("link", { name: activityFixture.ctaLabel });

    expect(cta).toHaveClass("w-full", "bg-clay-600");
    expect(cta).not.toHaveClass("link-underline");
  });

  it("sets the schedule apart in a sage pill with a clock and tabular numerals", () => {
    renderCard({ schedule: "Lunes de 10:00 a 12:00 h" });
    const pill = screen.getByText("Lunes de 10:00 a 12:00 h").parentElement;

    expect(pill?.querySelector("svg")).not.toBeNull();
    expect(pill).toHaveClass("bg-sage-200", "tabular-nums", "font-semibold");
  });

  it("crops the photo to a short landscape frame on phones", () => {
    renderCard();
    const photo = screen.getByRole("img");
    expect(photo).toHaveClass("aspect-3/2", "object-cover");
    expect(photo.style.aspectRatio).toBe("");
  });

  it("stays unchanged without schedule and badge", async () => {
    const { container } = renderCard();
    const scope = within(container);
    expect(scope.queryByText(/10:00/u)).toBeNull();
    expect(scope.queryByText("Inscripciones pausadas")).toBeNull();
    expect(scope.getByText(activityFixture.description)).toBeVisible();
    await expectNoAxeViolations(container);
  });
});
