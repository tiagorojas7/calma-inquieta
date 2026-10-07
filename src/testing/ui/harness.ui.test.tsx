import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "./axe";

describe("ui harness: rendering", () => {
  it("compiles JSX and exposes the jest-dom matchers", () => {
    render(<h1>Calma Inquieta</h1>);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Calma Inquieta");
  });

  it("cleans the document between tests", () => {
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("ui harness: axe helper", () => {
  it("passes for valid markup", async () => {
    const { container } = render(
      <main>
        <h1>Talleres</h1>
        <img src="/media/a.jpg" alt="Una mesa con arcilla" />
      </main>,
    );

    await expectNoAxeViolations(container);
  });

  it("fails and names the rule for an image without alt text", async () => {
    const { container } = render(<img src="/media/a.jpg" />);

    await expect(expectNoAxeViolations(container)).rejects.toThrow(/image-alt/);
  });

  it("runs the region rule only for page-level renders", async () => {
    const { container } = render(<p>Texto suelto fuera de un landmark</p>);

    await expectNoAxeViolations(container);
    await expect(
      expectNoAxeViolations(container, { page: true }),
    ).rejects.toThrow(/region/);
  });

  it("passes a page-level render whose content sits inside a landmark", async () => {
    const { container } = render(
      <main>
        <h1>Talleres</h1>
      </main>,
    );

    await expectNoAxeViolations(container, { page: true });
  });

  it("does not run the color-contrast rule", async () => {
    const { container } = render(
      <main>
        <p style={{ color: "#fff", background: "#fefefe" }}>Texto claro</p>
      </main>,
    );

    await expectNoAxeViolations(container);
  });
});

describe("ui harness: browser APIs missing in jsdom", () => {
  it("opens and closes a modal dialog and dispatches close", async () => {
    const { container } = render(
      <dialog aria-label="Galeria">
        <p>Contenido</p>
      </dialog>,
    );
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    const onClose = vi.fn();
    dialog?.addEventListener("close", onClose);

    dialog?.showModal();
    expect(dialog).toHaveAttribute("open");

    dialog?.close();
    expect(dialog).not.toHaveAttribute("open");
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("provides a matchMedia stub that reports no match", () => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    expect(query.matches).toBe(false);
    expect(query.media).toBe("(prefers-reduced-motion: reduce)");
    expect(() => {
      query.addEventListener("change", () => undefined);
    }).not.toThrow();
  });
});
