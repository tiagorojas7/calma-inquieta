import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ReadinessChecklist } from "./workshop-readiness";

const steps = [
  {
    key: "shift",
    label: "Tiene al menos un turno activo",
    done: true,
    href: "/a",
  },
  { key: "publish", label: "El taller está publicado", done: true, href: "/b" },
  { key: "month", label: "Abriste octubre", done: false, href: "/c" },
];

describe("ReadinessChecklist", () => {
  it("shows progress, a text state per step and one primary call to action", async () => {
    const { container } = render(
      <ReadinessChecklist
        monthName="octubre"
        summary="Falta abrir octubre"
        complete={false}
        steps={steps}
        next={{ cta: "Abrir inscripciones de octubre", href: "/c" }}
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Para abrir las inscripciones de octubre",
      }),
    ).toBeVisible();
    expect(screen.getByText("2 de 3 pasos listos")).toBeVisible();
    const [first, , third] = screen.getAllByRole("listitem");
    if (!first || !third) throw new Error("missing steps");
    expect(within(first).getByText("Listo")).toBeVisible();
    expect(within(third).getByText("Pendiente")).toBeVisible();
    expect(
      within(third).getByRole("link", { name: "Abriste octubre" }),
    ).toHaveAttribute("href", "/c");
    expect(
      screen.getByRole("link", { name: "Abrir inscripciones de octubre" }),
    ).toHaveAttribute("href", "/c");
    await expectNoAxeViolations(container);
  });

  it("shows no call to action once everything is ready", async () => {
    const { container } = render(
      <ReadinessChecklist
        monthName="octubre"
        summary="Inscripciones abiertas para octubre"
        complete
        steps={steps.map((step) => ({ ...step, done: true }))}
        next={null}
      />,
    );
    expect(
      screen.getByText("Inscripciones abiertas para octubre"),
    ).toBeVisible();
    expect(screen.queryAllByText("Pendiente")).toHaveLength(0);
    expect(screen.queryAllByRole("link", { name: /Abrir/ })).toHaveLength(0);
    await expectNoAxeViolations(container);
  });
});
