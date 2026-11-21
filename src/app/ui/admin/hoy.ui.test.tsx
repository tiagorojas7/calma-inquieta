import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Hoy, type HoyScreen, type TodoCard } from "./hoy";

const chargeCard: TodoCard = {
  kind: "form",
  id: "cobrar-order-1",
  title: "Ana Pérez",
  facts: "Cuota · Cerámica · octubre 2026",
  area: "enrollments",
  intent: "confirm-order",
  label: "Cobrar $ 45.000",
  ariaLabel: "Cobrar $ 45.000 a Ana Pérez",
  fields: { orderId: "order-1", amount: "45000" },
};

const eventCard: TodoCard = {
  kind: "event",
  id: "evento-ev-1",
  title: "Dora Ruiz",
  facts: "Evento privado · para el 05/12/2026",
  area: "events",
  href: "/admin/eventos/ev-1",
  whatsappHref: "https://wa.me/5493515550101",
};

const linkCard: TodoCard = {
  kind: "link",
  id: "turnos-p1",
  title: "Cerámica",
  facts: "Octubre sin turnos",
  area: "workshops",
  label: "Agregar turno",
  href: "/admin/talleres/w1",
};

const base: HoyScreen = {
  monthLabel: "octubre 2026",
  figures: {
    collected: "$ 96.000",
    toCollect: "$ 50.000",
    studio: "$ 63.000",
    studioTone: "income",
  },
  more: {
    occupancy: "39 %",
    occupancyDetail: "9 de 23 lugares",
    teachers: "$ 27.000",
    statisticsHref: "/admin/estadisticas?mes=2026-10",
  },
  todo: { cards: [chargeCard, eventCard, linkCard], seeAllHref: null },
  classes: [
    {
      key: "p1:t1",
      title: "Cerámica",
      facts: "18:00 a 20:00 h · 3 alumnas",
      href: "/admin/asistencia/p1/t1/2026-10-05",
    },
  ],
  novelties: [
    {
      area: "enrollments",
      key: "enrollment:order-9",
      href: "/admin/inscripciones/order-9",
      name: "Cleo Díaz",
      kindLabel: "Inscripción",
      detail: "Cerámica · octubre 2026",
      receivedAt: "30/10/2026 09:00",
    },
  ],
  moreNews: true,
};

function renderHoy(overrides: Partial<React.ComponentProps<typeof Hoy>> = {}) {
  return render(
    <Hoy
      screen={base}
      returnTo="/admin"
      saved={null}
      failure={null}
      {...overrides}
    />,
  );
}

const section = (name: string) =>
  screen
    .getByRole("heading", { level: 2, name })
    .closest("section") as HTMLElement;

describe("Hoy numbers", () => {
  it("shows cobrado, por cobrar and what is left for the studio, large", () => {
    renderHoy();
    const numbers = section("octubre 2026");
    for (const text of [
      "Cobrado",
      "$ 96.000",
      "Por cobrar",
      "$ 50.000",
      "Para el estudio",
      "$ 63.000",
    ])
      expect(within(numbers).getByText(text)).toBeVisible();
    expect(screen.getByText("$ 96.000")).toHaveClass("text-status-green-fg");
    expect(screen.getByText("$ 50.000")).toHaveClass("text-admin-warning-fg");
  });

  it("colours a month at a loss as money out", () => {
    renderHoy({
      screen: {
        ...base,
        figures: { ...base.figures, studio: "$ -5.000", studioTone: "expense" },
      },
    });
    expect(screen.getByText("$ -5.000")).toHaveClass("text-status-orange-fg");
  });

  it("keeps occupancy, teacher pay and the statistics behind 'Ver más', closed", () => {
    renderHoy();
    const more = screen.getByText("Ver más").closest("details");
    expect(more).not.toHaveAttribute("open");
    expect(within(more as HTMLElement).getByText("39 %")).toBeInTheDocument();
    expect(
      within(more as HTMLElement).getByText("$ 27.000"),
    ).toBeInTheDocument();
    expect(
      within(more as HTMLElement).getByRole("link", {
        name: "Ver estadísticas",
      }),
    ).toHaveAttribute("href", "/admin/estadisticas?mes=2026-10");
  });
});

describe("Hoy para hacer", () => {
  it("gives each pending fee a native form with its one button and its way back", () => {
    renderHoy();
    const card = screen.getByRole("article", { name: "Ana Pérez" });
    expect(card).toHaveAttribute("id", "cobrar-order-1");
    const form = card.querySelector<HTMLFormElement>("form");
    if (form === null) throw new Error("no form");
    expect(form).toHaveAttribute("method", "post");
    const value = (name: string) =>
      form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value;
    expect(value("intent")).toBe("confirm-order");
    expect(value("orderId")).toBe("order-1");
    expect(value("amount")).toBe("45000");
    expect(value("returnTo")).toBe("/admin");
    expect(value("anchor")).toBe("cobrar-order-1");
    expect(
      within(card).getByRole("button", { name: "Cobrar $ 45.000 a Ana Pérez" }),
    ).toHaveTextContent("Cobrar $ 45.000");
  });

  it("returns to the expanded list when the page was opened with every card", () => {
    renderHoy({ returnTo: "/admin?ver=todo" });
    const card = screen.getByRole("article", { name: "Ana Pérez" });
    expect(
      (card.querySelector('[name="returnTo"]') as HTMLInputElement).value,
    ).toBe("/admin?ver=todo");
  });

  it("opens a new private event or writes to her on WhatsApp", () => {
    renderHoy();
    const card = screen.getByRole("article", { name: "Dora Ruiz" });
    expect(
      within(card).getByRole("link", { name: "Ver consulta" }),
    ).toHaveAttribute("href", "/admin/eventos/ev-1");
    expect(
      within(card).getByRole("link", { name: /WhatsApp/ }),
    ).toHaveAttribute("href", "https://wa.me/5493515550101");
  });

  it("leaves WhatsApp out when the number cannot be dialed", () => {
    renderHoy({
      screen: {
        ...base,
        todo: {
          cards: [{ ...eventCard, whatsappHref: undefined }],
          seeAllHref: null,
        },
      },
    });
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
  });

  it("links the cards that only need a look", () => {
    renderHoy();
    const card = within(section("Para hacer")).getByRole("article", {
      name: "Cerámica",
    });
    expect(
      within(card).getByRole("link", { name: "Agregar turno" }),
    ).toHaveAttribute("href", "/admin/talleres/w1");
  });

  it("shows a refusal on its own card, with no other card touched", () => {
    renderHoy({
      failure: { card: "cobrar-order-1", message: "Ya estaba cobrado." },
    });
    const card = screen.getByRole("article", { name: "Ana Pérez" });
    expect(within(card).getByRole("alert")).toHaveTextContent(
      "Ya estaba cobrado.",
    );
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("shows the refusal above the list when its card is gone", () => {
    renderHoy({
      failure: { card: "cobrar-gone", message: "Ya estaba cobrado." },
    });
    const todo = section("Para hacer");
    const alert = within(todo).getByRole("alert");
    expect(alert).toHaveTextContent("Ya estaba cobrado.");
    expect(alert.closest("article")).toBeNull();
  });

  it("ends with 'Ver todo' only when cards are left out", () => {
    const { unmount } = renderHoy();
    expect(
      within(section("Para hacer")).queryByRole("link", { name: "Ver todo" }),
    ).toBeNull();
    unmount();
    renderHoy({
      screen: {
        ...base,
        todo: { ...base.todo, seeAllHref: "/admin?ver=todo#para-hacer" },
      },
    });
    expect(
      within(section("Para hacer")).getByRole("link", { name: "Ver todo" }),
    ).toHaveAttribute("href", "/admin?ver=todo#para-hacer");
  });

  it("says so when everything is done", () => {
    renderHoy({
      screen: { ...base, todo: { cards: [], seeAllHref: null } },
    });
    expect(
      within(section("Para hacer")).getByText("Todo al día"),
    ).toBeVisible();
  });
});

describe("Hoy classes and news", () => {
  it("lists today's classes with their time, students and attendance", () => {
    renderHoy();
    const card = within(section("Clases de hoy")).getByRole("article", {
      name: "Cerámica",
    });
    expect(within(card).getByText("18:00 a 20:00 h · 3 alumnas")).toBeVisible();
    expect(within(card).getByText("18:00 a 20:00 h · 3 alumnas")).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(
      within(card).getByRole("link", { name: "Tomar asistencia" }),
    ).toHaveAttribute("href", "/admin/asistencia/p1/t1/2026-10-05");
  });

  it("says so when there is no class today", () => {
    renderHoy({ screen: { ...base, classes: [] } });
    expect(
      within(section("Clases de hoy")).getByText("Hoy no hay clases"),
    ).toBeVisible();
  });

  it("shows what is new as small cards that open the item, and the bell page", () => {
    renderHoy();
    const news = section("Lo nuevo");
    expect(news).toHaveAttribute("id", "nuevo");
    expect(
      within(news).getByRole("link", { name: "Cleo Díaz" }),
    ).toHaveAttribute("href", "/admin/inscripciones/order-9");
    expect(within(news).getByText(/Inscripción/)).toBeVisible();
    expect(
      within(news).getByRole("link", { name: "Ver todo" }),
    ).toHaveAttribute("href", "/admin/novedades");
  });

  it("says so when nothing is new, with no link to an empty list", () => {
    renderHoy({ screen: { ...base, novelties: [], moreNews: false } });
    const news = section("Lo nuevo");
    expect(within(news).getByText("Nada nuevo")).toBeVisible();
    expect(within(news).queryByRole("link")).toBeNull();
  });
});

describe("Hoy page", () => {
  it("names what was just saved", () => {
    renderHoy({ saved: "cobro" });
    expect(screen.getByRole("status")).toHaveTextContent("Guardado: cobro");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderHoy({
      failure: { card: "cobrar-order-1", message: "Ya estaba cobrado." },
    });
    await expectNoAxeViolations(container);
  });
});
