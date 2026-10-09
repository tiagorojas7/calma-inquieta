import { render, screen } from "@testing-library/react";
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
      upcomingItemFixture.date,
    );
    expect(
      screen.getByRole("heading", { name: upcomingItemFixture.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: upcomingItemFixture.ctaLabel }),
    ).toHaveAttribute("href", upcomingItemFixture.href);
    await expectNoAxeViolations(container);
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
