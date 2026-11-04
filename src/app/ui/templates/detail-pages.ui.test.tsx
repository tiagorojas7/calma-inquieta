import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  IntensivoDetailPage,
  type IntensivoDetailProps,
} from "./intensivo-detail-page";
import { TallerDetailPage, type TallerDetailProps } from "./taller-detail-page";

const image = { src: "/a.webp", alt: "Taller", width: 800, height: 600 };
const gallery = [{ ...image, id: "g1" }];
const breadcrumb = { label: "Migas", items: [{ label: "Talleres" }] };

const taller: TallerDetailProps = {
  breadcrumb,
  name: "Cerámica",
  image,
  description: "Descripción",
  turnosHeading: "Turnos",
  turnos: [{ key: "1", weekday: "Lunes", timeRange: "18:00 a 20:00" }],
  fee: { label: "Cuota mensual", amount: "$ 40.000" },
  action: { kind: "enrollment", href: "/inscripcion", label: "Inscribirme" },
  gallery,
};

const intensivo: IntensivoDetailProps = {
  breadcrumb,
  name: "Intensivo",
  oneDay: "Encuentro de un solo día: te llevás tu pieza ya terminada.",
  image,
  dateLine: "Sábado 4 de abril",
  duration: "4 h",
  timeRange: "10:00 a 14:00",
  description: "Descripción",
  price: { label: "Precio", amount: "$ 50.000" },
  deposit: { label: "Seña", amount: "$ 20.000" },
  balance: { label: "Saldo restante", amount: "$ 30.000" },
  conditions: { label: "Condiciones", policyText: "Política", minSeats: "Mín" },
  gallery,
  action: { kind: "reserve", href: "/reserva", label: "Reservar lugar" },
};

function inRouter(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("TallerDetailPage", () => {
  it("puts the booking summary with the action before the description", () => {
    inRouter(<TallerDetailPage {...taller} />);
    const summary = screen.getByRole("complementary");
    expect(
      within(summary).getByRole("link", { name: "Inscribirme" }),
    ).toHaveAttribute("href", "/inscripcion");
    expect(within(summary).getByText("$ 40.000")).toBeInTheDocument();
    const description = screen.getByText("Descripción");
    expect(
      summary.compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("colors Inscribirme green and keeps an inquiry in the brand primary", () => {
    const { container, unmount } = inRouter(<TallerDetailPage {...taller} />);
    expect(screen.getByRole("link", { name: "Inscribirme" })).toHaveClass(
      "bg-moss-600",
    );
    expect(container.querySelector("[data-sticky-action] a")).toHaveClass(
      "bg-moss-600",
    );
    unmount();
    inRouter(
      <TallerDetailPage
        {...taller}
        action={{ kind: "inquiry", href: "/contacto", label: "Consultar" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Consultar" })).toHaveClass(
      "bg-clay-600",
    );
  });

  it("offers a sticky mobile action that stays out of the accessibility tree", () => {
    const { container } = inRouter(<TallerDetailPage {...taller} />);
    const bar = container.querySelector("[data-sticky-action]");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar?.querySelector("a")).toHaveAttribute("tabindex", "-1");
    expect(screen.getAllByRole("link", { name: "Inscribirme" })).toHaveLength(
      1,
    );
  });

  it("lays the sticky mobile bar as liquid glass", () => {
    const { container } = inRouter(<TallerDetailPage {...taller} />);
    const bar = container.querySelector("[data-sticky-action]");

    expect(bar).toHaveClass("glass");
    expect(bar?.className).not.toContain("bg-surface");
  });

  it("omits the sticky action when paused", () => {
    const { container } = inRouter(
      <TallerDetailPage
        {...taller}
        action={{
          kind: "paused",
          text: "En pausa",
          link: { href: "/c", label: "Escribinos" },
        }}
      />,
    );
    expect(container.querySelector("[data-sticky-action]")).toBeNull();
  });

  it("titles the gallery only when there are images", () => {
    const { unmount } = inRouter(<TallerDetailPage {...taller} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Galería" }),
    ).toBeInTheDocument();
    unmount();
    inRouter(<TallerDetailPage {...taller} gallery={[]} />);
    expect(screen.queryByRole("heading", { name: "Galería" })).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = inRouter(<TallerDetailPage {...taller} />);
    await expectNoAxeViolations(container);
  });
});

describe("IntensivoDetailPage", () => {
  it("labels total, reservation amount and remaining balance", () => {
    inRouter(<IntensivoDetailPage {...intensivo} />);
    const summary = screen.getByRole("complementary");
    const terms = within(summary)
      .getAllByRole("term")
      .map((term) => term.textContent);
    expect(terms).toEqual(
      expect.arrayContaining(["Precio", "Seña", "Saldo restante"]),
    );
    expect(within(summary).getByText("$ 20.000")).toBeInTheDocument();
    expect(within(summary).getByText("$ 30.000")).toBeInTheDocument();
    expect(
      within(summary).getByRole("link", { name: "Reservar lugar" }),
    ).toHaveAttribute("href", "/reserva");
  });

  it("says what a workshop is in the header, after the hours", () => {
    inRouter(<IntensivoDetailPage {...intensivo} />);
    const line = screen.getByText(intensivo.oneDay);

    expect(line.closest("header")).not.toBeNull();
    expect(line).toHaveClass("text-ink-700");
    expect(
      screen.getByText("4 h").compareDocumentPosition(line) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("tells the date, the hours and the duration apart in the header", () => {
    inRouter(<IntensivoDetailPage {...intensivo} />);

    // The date is the italic subtitle under the title.
    expect(screen.getByText("Sábado 4 de abril")).toHaveClass(
      "font-display",
      "italic",
    );
    // The hours and the duration are pills, not one line of plain text.
    expect(screen.getByText("10:00 a 14:00").parentElement).toHaveClass(
      "bg-sage-200",
      "tabular-nums",
    );
    expect(screen.getByText("4 h").parentElement).toHaveClass(
      "bg-sage-200",
      "tabular-nums",
    );
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("colors Reservar green", () => {
    inRouter(<IntensivoDetailPage {...intensivo} />);
    expect(screen.getByRole("link", { name: "Reservar lugar" })).toHaveClass(
      "bg-moss-600",
    );
  });

  it("repeats the action as a sticky mobile bar", () => {
    const { container } = inRouter(<IntensivoDetailPage {...intensivo} />);
    expect(container.querySelector("[data-sticky-action]")).not.toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = inRouter(<IntensivoDetailPage {...intensivo} />);
    await expectNoAxeViolations(container);
  });
});
