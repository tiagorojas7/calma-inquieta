import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { intensiveRequestsView } from "~/app/intensive-requests/admin-view";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import {
  buildIntensiveOffer,
  FAKE_INTENSIVE_ID,
  FAKE_PROJECT_ID,
} from "~/testing/fakes/intensive-request-builders";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { DEFAULT_BROWSE } from "./reservation-browse";
import {
  AdminClassesScreen,
  classesPath,
  type ClassesScreenData,
  type DatedCardData,
  type MonthlyCardData,
} from "./classes-screen";

const monthly: MonthlyCardData = {
  id: "w1",
  name: "Bordado",
  teacherName: "Ana Gómez",
  status: "published",
  openMonth: "noviembre",
  turnos: [
    { id: "t1", label: "Lunes 15:00", free: 3 },
    { id: "t2", label: "Martes 10:00", free: 1 },
    { id: "t3", label: "Jueves 18:00", free: 0 },
  ],
  openNext: { period: "2026-12", label: "diciembre" },
};

const reservations = intensiveRequestsView(
  {
    intensivo: buildIntensiveOffer(),
    confirmedSeats: 0,
    requests: [
      buildStoredRequest({
        id: "pending-1",
        fullName: "Ana Pérez",
        projectId: FAKE_PROJECT_ID,
      }),
    ],
  },
  "2026-10-28",
);

const dated: DatedCardData = {
  id: FAKE_INTENSIVE_ID,
  name: "Intensivo de cerámica",
  teacherName: null,
  when: "14 nov 2026, 10:00",
  status: "published",
  capacity: 8,
  taken: 3,
  pending: 2,
  reservations: null,
};

const base: ClassesScreenData = {
  saved: null,
  showPast: false,
  openId: null,
  monthly: [monthly],
  dated: [dated],
  pastMonthly: [],
  pastDated: [],
};

describe("AdminClassesScreen", () => {
  it("shows a monthly taller with its teacher, open month and each turno with free seats", () => {
    render(<AdminClassesScreen data={base} />);

    const card = screen.getByRole("article", { name: "Bordado" });
    expect(card).toHaveTextContent("Ana Gómez · Abierto: noviembre");
    expect(within(card).getByText("Lunes 15:00 · 3 libres")).toBeVisible();
    expect(within(card).getByText("Martes 10:00 · 1 libre")).toBeVisible();
    expect(within(card).getByText("Jueves 18:00 · Completo")).toBeVisible();
    expect(within(card).getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/admin/talleres/w1",
    );
  });

  it("offers Abrir <mes> in one native post that comes back to the same card", () => {
    render(<AdminClassesScreen data={base} />);

    const card = screen.getByRole("article", { name: "Bordado" });
    const button = within(card).getByRole("button", {
      name: "Abrir diciembre",
    });
    const form = button.closest("form");
    expect(form).toHaveAttribute("method", "post");
    const hidden = (name: string) =>
      form?.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(hidden("intent")).toBe("open-month");
    expect(hidden("workshopId")).toBe("w1");
    expect(hidden("period")).toBe("2026-12");
    expect(hidden("returnTo")).toBe("/admin/clases");
    expect(hidden("anchor")).toBe("taller-w1");
    expect(card).toHaveAttribute("id", "taller-w1");
  });

  it("offers no month and no turnos when nothing is open or can be opened", () => {
    render(
      <AdminClassesScreen
        data={{
          ...base,
          monthly: [
            { ...monthly, openMonth: null, turnos: [], openNext: null },
          ],
        }}
      />,
    );

    const card = screen.getByRole("article", { name: "Bordado" });
    expect(card).toHaveTextContent("Sin mes abierto");
    expect(within(card).queryByRole("button")).toBeNull();
  });

  it("names the state of a taller that is not published", () => {
    render(
      <AdminClassesScreen
        data={{
          ...base,
          monthly: [
            { ...monthly, status: "paused", turnos: [], openNext: null },
          ],
        }}
      />,
    );

    expect(screen.getByRole("article", { name: "Bordado" })).toHaveTextContent(
      "En pausa",
    );
  });

  it("shows a dated workshop with its date, seats taken out of capacity and who waits", () => {
    render(<AdminClassesScreen data={base} />);

    const card = screen.getByRole("article", { name: "Intensivo de cerámica" });
    expect(within(card).getByText("3 de 8 lugares")).toHaveClass(
      "text-2xl",
      "font-bold",
    );
    expect(within(card).getByText("3 de 8 lugares")).toHaveAttribute(
      "data-summary-tone",
      "neutral",
    );
    expect(card).toHaveTextContent("14 nov 2026, 10:00 · 2 por confirmar");
    expect(
      within(card).getByRole("link", { name: "Ver reservas" }),
    ).toHaveAttribute(
      "href",
      `/admin/clases?abrir=${FAKE_INTENSIVE_ID}#workshop-${FAKE_INTENSIVE_ID}`,
    );
    expect(within(card).queryByRole("form")).toBeNull();
  });

  it("shows the reservations inline on the open card, with Ocultar reservas to close them", () => {
    render(
      <AdminClassesScreen
        data={{
          ...base,
          openId: FAKE_INTENSIVE_ID,
          dated: [
            {
              ...dated,
              reservations: {
                today: "2026-10-28",
                groups: reservations.groups,
                browse: DEFAULT_BROWSE,
              },
            },
          ],
        }}
      />,
    );

    const card = screen.getByRole("article", { name: "Intensivo de cerámica" });
    expect(
      within(card).getByRole("link", { name: "Ocultar reservas" }),
    ).toHaveAttribute("href", `/admin/clases#workshop-${FAKE_INTENSIVE_ID}`);
    const person = within(card).getByRole("article", { name: "Ana Pérez" });
    expect(person).toHaveTextContent("Pidió lugar");
    expect(person.querySelector("[data-summary-tone]")).toHaveTextContent(
      /^Seña \$/,
    );
    const form = within(person).getByRole("form", { name: /Confirmar seña/ });
    const hidden = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(hidden("intensiveId")).toBe(FAKE_INTENSIVE_ID);
    expect(hidden("returnTo")).toBe(
      `/admin/clases?abrir=${FAKE_INTENSIVE_ID}&ver=pending-1`,
    );
    expect(hidden("anchor")).toBe("reserva-pending-1");
  });

  it("shows an owed reservation balance once, ahead of its details", () => {
    const group = reservations.groups[0];
    const pending = group?.rows[0];
    if (!group || !pending) throw new Error("missing reservation fixture");
    render(
      <AdminClassesScreen
        data={{
          ...base,
          openId: FAKE_INTENSIVE_ID,
          dated: [
            {
              ...dated,
              reservations: {
                today: "2026-10-28",
                browse: DEFAULT_BROWSE,
                groups: [
                  {
                    ...group,
                    status: "confirmed",
                    rows: [
                      {
                        ...pending,
                        balanceDue: "$ 25.000",
                        balance: null,
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }}
      />,
    );
    const person = screen.getByRole("article", { name: "Ana Pérez" });
    expect(person.querySelector("[data-summary-tone]")).toHaveTextContent(
      "Debe $ 25.000",
    );
    expect(person.querySelector("[data-facts]")).toHaveTextContent(
      "Pagó la seña",
    );
    expect(person.querySelector("[data-facts]")).not.toHaveTextContent(
      "$ 25.000",
    );
  });

  it("keeps the past list open in the address the forms return to", () => {
    render(
      <AdminClassesScreen
        data={{
          ...base,
          showPast: true,
          openId: FAKE_INTENSIVE_ID,
          dated: [
            {
              ...dated,
              reservations: {
                today: "2026-10-28",
                groups: reservations.groups,
                browse: DEFAULT_BROWSE,
              },
            },
          ],
        }}
      />,
    );

    const form = screen.getByRole("form", { name: /Confirmar seña/ });
    expect(
      form.querySelector<HTMLInputElement>('input[name="returnTo"]')?.value,
    ).toBe(
      `/admin/clases?abrir=${FAKE_INTENSIVE_ID}&anteriores=1&ver=pending-1`,
    );
  });

  it("keeps Nuevo taller and Nuevo workshop as secondary buttons to the existing forms", () => {
    render(<AdminClassesScreen data={base} />);

    expect(screen.getByRole("link", { name: "Nuevo taller" })).toHaveAttribute(
      "href",
      "/admin/talleres/nuevo",
    );
    expect(
      screen.getByRole("link", { name: "Nuevo workshop" }),
    ).toHaveAttribute("href", "/admin/intensivos/nuevo");
    expect(screen.getByRole("link", { name: "Nuevo taller" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("puts past items behind Ver anteriores and shows them only when asked", () => {
    const { rerender } = render(<AdminClassesScreen data={base} />);
    expect(
      screen.getByRole("link", { name: "Ver anteriores" }),
    ).toHaveAttribute("href", "/admin/clases?anteriores=1");
    expect(screen.queryByText("Anteriores: Workshops")).toBeNull();

    rerender(
      <AdminClassesScreen
        data={{
          ...base,
          showPast: true,
          pastDated: [{ ...dated, id: "old", name: "Workshop viejo" }],
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Ocultar anteriores" }),
    ).toHaveAttribute("href", "/admin/clases");
    expect(
      screen.getByRole("article", { name: "Workshop viejo" }),
    ).toBeInTheDocument();
  });

  it("says what was saved in a few words, and says so when there is nothing yet", () => {
    render(
      <AdminClassesScreen
        data={{ ...base, saved: "opened", monthly: [], dated: [] }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardado: mes abierto",
    );
    expect(screen.getByText("Todavía no hay talleres.")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay workshops.")).toBeInTheDocument();
  });

  it("links to attendance so no old task becomes unreachable", () => {
    render(<AdminClassesScreen data={base} />);
    expect(
      screen.getByRole("link", { name: "Tomar asistencia" }),
    ).toHaveAttribute("href", "/admin/asistencia");
  });

  it("builds the address that keeps the open card and the past list", () => {
    expect(classesPath({})).toBe("/admin/clases");
    expect(classesPath({ open: "x", past: true })).toBe(
      "/admin/clases?abrir=x&anteriores=1",
    );
  });

  it("uses only plain anchors and native forms, and has no accessibility violations", async () => {
    const { container } = render(
      <AdminClassesScreen
        data={{
          ...base,
          openId: FAKE_INTENSIVE_ID,
          dated: [
            {
              ...dated,
              reservations: {
                today: "2026-10-28",
                groups: reservations.groups,
                browse: DEFAULT_BROWSE,
              },
            },
          ],
        }}
      />,
    );

    for (const form of container.querySelectorAll("form"))
      expect(form).toHaveAttribute("method", "post");
    await expectNoAxeViolations(container);
  });
});
