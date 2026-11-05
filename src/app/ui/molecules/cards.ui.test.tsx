import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  activityFixture,
  testimonialFixture,
  upcomingItemFixture,
} from "~/testing/fixtures/ui";
import { ActivityCard } from "./activity-card";
import { TestimonialCard } from "./testimonial-card";
import { UpcomingItem } from "./upcoming-item";

const renderWithRouter = (element: React.ReactNode) =>
  render(<MemoryRouter>{element}</MemoryRouter>);

describe("home cards", () => {
  it("uses the raised semantic elevation role for cards", () => {
    const { container } = renderWithRouter(
      <ActivityCard {...activityFixture} />,
    );

    expect(container.querySelector("article")).toHaveClass("shadow-raised");
  });

  it("renders an activity image, copy and lazy CTA", async () => {
    const { container } = renderWithRouter(
      <ActivityCard {...activityFixture} />,
    );
    expect(
      screen.getByRole("img", { name: activityFixture.image.alt }),
    ).toHaveAttribute("loading", "lazy");
    expect(
      screen.getByRole("heading", { name: activityFixture.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(activityFixture.description)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: activityFixture.ctaLabel }),
    ).toHaveAttribute("href", activityFixture.href);
    await expectNoAxeViolations(container);
  });

  it("renders the upcoming date, title and CTA", async () => {
    const { container } = renderWithRouter(
      <UpcomingItem {...upcomingItemFixture} />,
    );
    expect(screen.getByRole("time")).toHaveAttribute(
      "dateTime",
      upcomingItemFixture.date.dateTime,
    );
    expect(screen.getByRole("time")).toHaveAccessibleName(
      upcomingItemFixture.date.label,
    );
    expect(
      screen.getByRole("heading", { name: upcomingItemFixture.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: upcomingItemFixture.ctaLabel }),
    ).toHaveAttribute("href", upcomingItemFixture.href);
    await expectNoAxeViolations(container);
  });

  it("reads as a soft ticket with a sage date block and a full-width button on phones", () => {
    const { container } = renderWithRouter(
      <UpcomingItem {...upcomingItemFixture} detail="10:00 a 12:00 h" />,
    );
    const date = screen.getByRole("time");
    const cta = screen.getByRole("link", {
      name: upcomingItemFixture.ctaLabel,
    });

    expect(container.querySelector("article")).toHaveClass(
      "bg-sand-100",
      "rounded-md",
    );
    expect(date.parentElement).toHaveClass("bg-sage-200");
    expect(date).toHaveClass("text-olive-800");
    expect(cta).toHaveClass("w-full", "sm:w-auto");
    expect(cta).not.toHaveClass("link-underline");
    // The hours are their own pill, apart from the title.
    expect(screen.getByText("10:00 a 12:00 h").parentElement).toHaveClass(
      "bg-sage-200",
      "tabular-nums",
    );
  });

  it("renders the upcoming detail and badge only when given", async () => {
    const { container } = renderWithRouter(
      <UpcomingItem
        {...upcomingItemFixture}
        detail="10:00 a 12:00 h"
        badge="Pausado"
      />,
    );
    expect(screen.getByText("10:00 a 12:00 h")).toBeInTheDocument();
    expect(screen.getByText("Pausado")).toBeInTheDocument();
    await expectNoAxeViolations(container);
    const plain = renderWithRouter(<UpcomingItem {...upcomingItemFixture} />);
    const scope = within(plain.container);
    expect(
      scope.getByRole("heading", { name: upcomingItemFixture.title }),
    ).toBeVisible();
    expect(scope.queryByText("10:00 a 12:00 h")).toBeNull();
    expect(scope.queryByText("Pausado")).toBeNull();
  });

  it("renders a testimonial quote and author", async () => {
    const { container } = renderWithRouter(
      <TestimonialCard {...testimonialFixture} />,
    );
    expect(screen.getByText(testimonialFixture.quote)).toBeInTheDocument();
    expect(screen.getByText(testimonialFixture.author)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
