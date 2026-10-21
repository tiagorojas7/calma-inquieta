import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  removeIntersectionObserver,
  restoreBrowserStubs,
  stubIntersectionObserver,
  stubMatchMedia,
} from "~/testing/ui/browser-stubs";
import { Reveal } from "./reveal";

let observer: ReturnType<typeof stubIntersectionObserver>;

/** jsdom has no layout: place every element at the given distance from the top. */
function placeAt(top: number) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
}

beforeEach(() => {
  observer = stubIntersectionObserver();
  stubMatchMedia({ reduce: false });
});

afterEach(() => {
  restoreBrowserStubs();
});

describe("Reveal on the server", () => {
  it("ships fully visible markup: no hidden state and no opacity", () => {
    const html = renderToStaticMarkup(
      <Reveal delay={200}>
        <p>Contenido</p>
      </Reveal>,
    );

    expect(html).toContain("Contenido");
    expect(html).not.toContain('data-reveal="hidden"');
    expect(html).not.toMatch(/opacity/i);
    expect(html).not.toMatch(/visibility|display:\s*none/i);
  });
});

describe("Reveal in the browser", () => {
  it("stays visible and unobserved when it starts inside the viewport", () => {
    placeAt(100);
    render(
      <Reveal>
        <p>Arriba</p>
      </Reveal>,
    );

    expect(screen.getByText("Arriba").parentElement).toHaveAttribute(
      "data-reveal",
      "visible",
    );
    expect(observer.active()).toBe(0);
  });

  it("hides below the fold after mount and shows when it scrolls into view", () => {
    placeAt(2000);
    render(
      <Reveal>
        <p>Abajo</p>
      </Reveal>,
    );
    const wrapper = screen.getByText("Abajo").parentElement;

    expect(wrapper).toHaveAttribute("data-reveal", "hidden");
    expect(observer.active()).toBe(1);

    observer.trigger(false);
    expect(wrapper).toHaveAttribute("data-reveal", "hidden");

    observer.trigger(true);
    expect(wrapper).toHaveAttribute("data-reveal", "shown");
    expect(observer.active()).toBe(0);
  });

  it("never hides under prefers-reduced-motion: reduce", () => {
    stubMatchMedia({ reduce: true });
    placeAt(2000);
    render(
      <Reveal>
        <p>Quieto</p>
      </Reveal>,
    );

    expect(screen.getByText("Quieto").parentElement).toHaveAttribute(
      "data-reveal",
      "visible",
    );
    expect(observer.active()).toBe(0);
  });

  it("stays visible when IntersectionObserver is unavailable", () => {
    removeIntersectionObserver();
    placeAt(2000);
    render(
      <Reveal>
        <p>Sin observador</p>
      </Reveal>,
    );

    expect(screen.getByText("Sin observador").parentElement).toHaveAttribute(
      "data-reveal",
      "visible",
    );
  });

  it("disconnects its observer on unmount", () => {
    placeAt(2000);
    const { unmount } = render(
      <Reveal>
        <p>Efímero</p>
      </Reveal>,
    );

    expect(observer.active()).toBe(1);
    unmount();
    expect(observer.active()).toBe(0);
  });
});

describe("Reveal stagger and markup", () => {
  it("sets the transition delay from the delay prop in milliseconds", () => {
    render(
      <Reveal delay={240}>
        <p>Con demora</p>
      </Reveal>,
    );

    expect(
      screen
        .getByText("Con demora")
        .parentElement?.style.getPropertyValue("--reveal-delay"),
    ).toBe("240ms");
  });

  it("derives the delay from the index, 80 ms per step, and lets delay win", () => {
    render(
      <>
        <Reveal index={3}>
          <p>Tercero</p>
        </Reveal>
        <Reveal index={3} delay={50}>
          <p>Explícito</p>
        </Reveal>
        <Reveal>
          <p>Sin demora</p>
        </Reveal>
      </>,
    );
    const delay = (text: string) =>
      screen
        .getByText(text)
        .parentElement?.style.getPropertyValue("--reveal-delay");

    expect(delay("Tercero")).toBe("240ms");
    expect(delay("Explícito")).toBe("50ms");
    expect(delay("Sin demora")).toBe("");
  });

  it("renders the requested element, merges className and passes attributes", async () => {
    const { container } = render(
      <ul>
        <Reveal as="li" className="mt-4" id="item">
          Elemento
        </Reveal>
      </ul>,
    );
    const item = screen.getByRole("listitem");

    expect(item.tagName).toBe("LI");
    expect(item).toHaveClass("mt-4");
    expect(item).toHaveAttribute("id", "item");
    await expectNoAxeViolations(container);
  });
});
