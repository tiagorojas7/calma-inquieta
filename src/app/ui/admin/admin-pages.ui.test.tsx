import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminDeniedPage } from "./admin-denied-page";
import { AdminErrorState } from "./admin-error-state";
import { AdminLanding } from "./admin-landing";

describe("AdminDeniedPage", () => {
  it("shows the denial message and the identity email, with no admin navigation", async () => {
    const { container } = render(<AdminDeniedPage email="mal@example.com" />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "No tenés acceso al panel",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/mal@example\.com/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("link", { name: "Talleres" })).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("omits the email when none was verified", () => {
    render(<AdminDeniedPage email={null} />);
    expect(screen.queryByText(/Iniciaste sesión/)).toBeNull();
  });
});

describe("AdminLanding", () => {
  it("greets by email and links the four areas without metrics", async () => {
    const { container } = render(<AdminLanding email="agus@example.com" />);
    expect(screen.getByText("Hola, agus@example.com")).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
      [
        "Talleres",
        "Intensivos",
        "Profesores",
        "Inscripciones",
        "Alumnas",
        "Materiales",
      ],
    );
    expect(screen.queryByRole("table")).toBeNull();
    await expectNoAxeViolations(container);
  });
});

describe("AdminErrorState", () => {
  it("says the section is under construction for 503", () => {
    render(<AdminErrorState status={503} />);
    expect(
      screen.getByRole("heading", {
        name: "Esta sección está en construcción",
      }),
    ).toBeInTheDocument();
  });

  it("stays generic for any other status", () => {
    render(<AdminErrorState status={500} />);
    expect(
      screen.getByRole("heading", { name: "Algo salió mal" }),
    ).toBeInTheDocument();
  });
});
