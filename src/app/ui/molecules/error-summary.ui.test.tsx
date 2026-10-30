import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorSummary } from "./error-summary";

const errors = [
  { fieldId: "fullName", message: "Ingresá tu nombre." },
  { fieldId: "email", message: "Ingresá un email válido." },
];

describe("ErrorSummary (EN01)", () => {
  it("links every message to its field and focuses itself", () => {
    render(<ErrorSummary title="Revisá estos datos" errors={errors} />);
    const summary = screen.getByRole("alert");
    expect(summary).toHaveAttribute("tabindex", "-1");
    expect(summary).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Ingresá tu nombre." }),
    ).toHaveAttribute("href", "#fullName");
    expect(
      screen.getByRole("link", { name: "Ingresá un email válido." }),
    ).toHaveAttribute("href", "#email");
  });

  it("focuses again when a new failure replaces the errors", () => {
    const { rerender } = render(
      <ErrorSummary title="Revisá" errors={errors} />,
    );
    screen.getByRole("alert").blur();
    rerender(<ErrorSummary title="Revisá" errors={errors.slice(0, 1)} />);
    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("renders nothing without errors", () => {
    const { container } = render(<ErrorSummary title="Revisá" errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
