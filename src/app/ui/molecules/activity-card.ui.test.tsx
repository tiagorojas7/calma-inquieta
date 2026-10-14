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
    await expectNoAxeViolations(container);
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
