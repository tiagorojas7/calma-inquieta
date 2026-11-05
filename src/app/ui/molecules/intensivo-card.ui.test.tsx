import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import {
  intensivoCardFixture,
  intensivoCardNoMaterialsFixture,
  intensivoCardPausedFixture,
} from "~/testing/fixtures/catalog";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensivoCard } from "./intensivo-card";

const renderCard = (props: Parameters<typeof IntensivoCard>[0]) =>
  render(
    <MemoryRouter>
      <IntensivoCard {...props} />
    </MemoryRouter>,
  );

describe("IntensivoCard", () => {
  it("shows the date badge, duration, price, deposit, materials badge and seats", async () => {
    const { container } = renderCard(intensivoCardFixture);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: intensivoCardFixture.name,
      }),
    ).toBeVisible();
    expect(screen.getByRole("time")).toHaveAccessibleName(
      intensivoCardFixture.date.label,
    );
    expect(screen.getByRole("time")).toHaveTextContent("14");
    expect(screen.getByRole("time").parentElement).toHaveClass("glass");
    expect(screen.getByRole("time")).toHaveClass("text-ink-900");
    expect(screen.getByText("2 h 30 min")).toBeVisible();
    expect(screen.getByText("$ 45.000")).toBeVisible();
    expect(screen.getByText("Seña $ 15.000")).toBeVisible();
    expect(screen.getByText("Materiales incluidos")).toBeVisible();
    expect(screen.getByText(intensivoCardFixture.teacher)).toBeVisible();
    expect(screen.getByText("Cupo limitado")).toBeVisible();
    expect(
      screen.getByRole("link", { name: intensivoCardFixture.ctaLabel }),
    ).toHaveAttribute("href", intensivoCardFixture.href);
    expect(screen.getByRole("article")).toHaveClass("card-hover", "h-full");
    expect(
      screen.getByRole("img", { name: intensivoCardFixture.image.alt })
        .parentElement,
    ).toHaveClass("card-hover-frame");
    await expectNoAxeViolations(container);
  });

  it("separates the price block and anchors a full-width CTA", () => {
    renderCard(intensivoCardFixture);
    const price = screen.getByText("$ 45.000");
    expect(price.closest("[data-slot='price-block']")).toHaveClass(
      "border-t",
      "border-tan-400",
    );
    expect(
      within(
        price.closest("[data-slot='price-block']") as HTMLElement,
      ).getByText("Seña $ 15.000"),
    ).toBeVisible();
    const cta = screen.getByRole("link", {
      name: intensivoCardFixture.ctaLabel,
    });
    expect(cta).toHaveClass("bg-clay-600", "w-full");
  });

  it("is the liquid-glass card: glass chips over the photo and a glass panel over its lower edge", () => {
    renderCard(intensivoCardFixture);
    const photo = screen.getByRole("img", {
      name: intensivoCardFixture.image.alt,
    });
    const frame = photo.parentElement as HTMLElement;
    const panel = screen
      .getByRole("heading", { level: 2, name: intensivoCardFixture.name })
      .closest(".glass");

    // Date, materials and seats are glass chips on the photo.
    expect(frame.querySelectorAll(".glass").length).toBeGreaterThanOrEqual(3);
    expect(frame).toContainElement(screen.getByText("Cupo limitado"));
    expect(frame).toContainElement(screen.getByText("Materiales incluidos"));
    // The details sit on a glass panel that rises over the photo.
    expect(panel).not.toBeNull();
    expect(panel).toHaveClass("-mt-10");
    expect(frame).not.toContainElement(panel as HTMLElement);
    expect(screen.getByRole("article")).not.toHaveClass("bg-cocoa-900");
  });

  it("labels the teacher and shows a short line about her", () => {
    renderCard({
      ...intensivoCardFixture,
      teacherBio: "Ceramista invitada, trabaja el barro desde hace años.",
    });

    expect(screen.getByText("Profesora:")).toBeVisible();
    expect(screen.getByText(intensivoCardFixture.teacher)).toBeVisible();
    expect(
      screen.getByText("Ceramista invitada, trabaja el barro desde hace años."),
    ).toHaveClass("line-clamp-2");
  });

  it("tells title, subtitle and hours apart by typeface and treatment", () => {
    renderCard(intensivoCardFixture);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: intensivoCardFixture.name,
      }),
    ).toHaveClass("font-display", "font-semibold");
    expect(screen.getByText(intensivoCardFixture.teacher)).toHaveClass(
      "font-display",
      "italic",
    );
    expect(screen.getByText("2 h 30 min").parentElement).toHaveClass(
      "bg-sage-200",
      "font-semibold",
      "tabular-nums",
    );
  });

  it("shows the always-visible policy note with no minimum seats line", async () => {
    const { container } = renderCard(intensivoCardFixture);
    expect(
      screen.getByText(intensivoCardFixture.conditions.policyText),
    ).toBeVisible();
    expect(container.querySelector("details")).toBeNull();
    expect(container.textContent).not.toMatch(/mínimo/iu);
    await expectNoAxeViolations(container);
  });

  it("omits the materials badge when it is not given", () => {
    const { container } = renderCard(intensivoCardNoMaterialsFixture);
    expect(within(container).queryByText("Materiales incluidos")).toBeNull();
    expect(within(container).getByText("Seña $ 15.000")).toBeVisible();
  });

  it("shows the paused notice, keeps the link and hides the seats indicator", async () => {
    const { container } = renderCard({
      ...intensivoCardPausedFixture,
      seats: "Cupo limitado",
    });
    expect(screen.getByText("Pausado")).toHaveAttribute("data-tone", "notice");
    expect(screen.getByText("Inscripciones pausadas")).toBeVisible();
    expect(screen.queryByText("Cupo limitado")).toBeNull();
    expect(
      screen.getByRole("link", { name: intensivoCardPausedFixture.ctaLabel }),
    ).toHaveAttribute("href", intensivoCardPausedFixture.href);
    await expectNoAxeViolations(container);
  });
});
