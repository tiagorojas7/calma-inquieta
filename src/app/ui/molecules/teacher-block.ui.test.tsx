import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { TeacherBlock } from "./teacher-block";

describe("TeacherBlock", () => {
  it("renders the heading, name and bio line", async () => {
    const { container } = render(
      <TeacherBlock
        heading="Quién lo dicta"
        name="Ana Pérez"
        bioLine="Ceramista desde 2010"
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Quién lo dicta" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Ceramista desde 2010")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("omits the bio line when absent", async () => {
    const { container } = render(
      <TeacherBlock heading="Quién lo dicta" name="Ana Pérez" />,
    );
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
    await expectNoAxeViolations(container);
  });
});
