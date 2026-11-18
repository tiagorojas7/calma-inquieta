import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminClassesHub } from "./classes-hub";

describe("AdminClassesHub", () => {
  it("carries only the two cards, to talleres and workshops", async () => {
    const { container } = render(<AdminClassesHub />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Clases" }),
    ).toBeVisible();
    const list = screen.getByRole("list", { name: "Clases" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Talleres", "/admin/talleres"],
      ["Workshops", "/admin/intensivos"],
    ]);
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    await expectNoAxeViolations(container);
  });
});
