import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminButton } from "./admin-button";
import { AdminActionCard, AdminHubCard } from "./action-card";

describe("AdminActionCard", () => {
  it("shows a title, one line of facts and one primary action", async () => {
    const { container } = render(
      <AdminActionCard
        id="inscripcion-1"
        title="Ana Pérez"
        summary="Debe $45.000"
        summaryTone="owed"
        facts="Cuota de noviembre"
        primary={<AdminButton type="submit">Cobrar</AdminButton>}
      />,
    );
    const card = screen.getByRole("article", { name: "Ana Pérez" });
    expect(card).toHaveAttribute("id", "inscripcion-1");
    expect(within(card).getByText("Debe $45.000")).toBeVisible();
    expect(within(card).getByText("Debe $45.000")).toHaveAttribute(
      "data-summary-tone",
      "owed",
    );
    expect(within(card).getByRole("button", { name: "Cobrar" })).toBeVisible();
    expect(
      within(card).getByRole("heading", { level: 3, name: "Ana Pérez" }),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("keeps the title, bold key number, details, and action in that order", () => {
    render(
      <AdminActionCard
        title="Ana Pérez"
        summary="Debe $45.000"
        summaryTone="owed"
        facts="Cuota de noviembre"
        primary={<AdminButton>Cobrar</AdminButton>}
      />,
    );
    const card = screen.getByRole("article", { name: "Ana Pérez" });
    const title = within(card).getByRole("heading", { name: "Ana Pérez" });
    const summary = within(card).getByText("Debe $45.000");
    const facts = card.querySelector("[data-facts]");
    const action = within(card).getByRole("button", { name: "Cobrar" });
    if (facts === null) throw new Error("missing card facts");
    expect(
      title.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      summary.compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      facts.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(summary).toHaveClass("text-2xl", "font-bold", "tabular-nums");
  });

  it("lists optional secondary links after the primary action", () => {
    render(
      <AdminActionCard
        title="Cerámica"
        primary={<AdminButton type="submit">Abrir</AdminButton>}
        secondary={[
          { label: "Ver ficha", href: "/admin/talleres/w1" },
          { label: "Editar", href: "/admin/talleres/w1#editar" },
        ]}
      />,
    );
    const card = screen.getByRole("article", { name: "Cerámica" });
    const links = within(card).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Ver ficha",
      "Editar",
    ]);
    expect(links[0]).toHaveAttribute("href", "/admin/talleres/w1");
  });

  it("draws no facts and no links when none are given", () => {
    render(
      <AdminActionCard
        title="Solo título"
        primary={<AdminButton>Hacer</AdminButton>}
      />,
    );
    const card = screen.getByRole("article", { name: "Solo título" });
    expect(within(card).queryByRole("link")).toBeNull();
    expect(card.querySelector("[data-facts]")).toBeNull();
  });

  it("carries the area chip when an area is given, and never a gradient", () => {
    const { container } = render(
      <AdminActionCard
        area="students"
        title="Ana"
        primary={<AdminButton>Cobrar</AdminButton>}
      />,
    );
    expect(
      container.querySelector("[data-area-chip='students']"),
    ).not.toBeNull();
    expect(container.innerHTML).not.toMatch(/gradient/);
  });
});

describe("AdminHubCard", () => {
  it("is one big link: the title opens the page, a few words say what is there", async () => {
    const { container } = render(
      <ul>
        <li>
          <AdminHubCard
            area="teachers"
            title="Profesoras"
            hint="Quiénes dan clase"
            href="/admin/profesores"
          />
        </li>
      </ul>,
    );
    const link = screen.getByRole("link", { name: "Profesoras" });
    expect(link).toHaveAttribute("href", "/admin/profesores");
    expect(link).toHaveClass("min-h-11");
    expect(screen.getByText("Quiénes dan clase")).toBeVisible();
    expect(
      container.querySelector("[data-area-chip='teachers']"),
    ).not.toBeNull();
    await expectNoAxeViolations(container);
  });

  it("works without a hint", () => {
    render(
      <ul>
        <li>
          <AdminHubCard
            title="Talleres"
            href="/admin/talleres"
            area="workshops"
          />
        </li>
      </ul>,
    );
    expect(screen.getByRole("link", { name: "Talleres" })).toBeVisible();
  });

  it("gives every card title the same card style, whatever its heading level", () => {
    render(
      <>
        <AdminActionCard
          title="Nivel tres"
          headingLevel={3}
          primary={<AdminButton type="submit">Cobrar</AdminButton>}
        />
        <AdminActionCard
          title="Nivel cuatro"
          headingLevel={4}
          primary={<AdminButton type="submit">Cobrar</AdminButton>}
        />
      </>,
    );
    const three = screen.getByRole("heading", { level: 3, name: "Nivel tres" });
    const four = screen.getByRole("heading", {
      level: 4,
      name: "Nivel cuatro",
    });
    expect(three).toHaveAttribute("data-card-title");
    expect(four).toHaveAttribute("data-card-title");
    expect(four.className).toBe(three.className);
  });
});
