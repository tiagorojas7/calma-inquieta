import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BotanicalSprig } from "./botanical-sprig";
import { Butterfly } from "./butterfly";
import { CordDivider, twinedStrand } from "./cord-divider";

/** Every cubic segment of a strand as [startX, endX, ...control xs]. */
function segments(d: string) {
  const start = Number(d.match(/^M([\d.]+) /)?.[1]);
  const curves = [
    ...d.matchAll(/C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)/g),
  ];
  let from = start;
  return curves.map((curve) => {
    const [c1x, c1y, c2x, c2y, ex, ey] = curve.slice(1).map(Number) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const segment = { from, c1x, c1y, c2x, c2y, ex, ey };
    from = ex;
    return segment;
  });
}

describe("CordDivider", () => {
  it("is aria-hidden, focusable false and uses currentColor", () => {
    const { container } = render(<CordDivider />);
    const svg = container.querySelector("svg");

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg?.querySelector("title")).toBeNull();
    expect(container.textContent).toBe("");
    for (const shape of container.querySelectorAll("path, circle")) {
      expect(shape).toHaveAttribute("stroke", "currentColor");
    }
  });

  it("has a reserved height and no external request", () => {
    const { container } = render(<CordDivider />);

    expect(container.querySelector("svg")).toHaveClass("h-6", "w-full");
    expect(container.querySelector("svg")).toHaveAttribute(
      "viewBox",
      "0 0 320 24",
    );
    expect(container.innerHTML).not.toMatch(/href=|src=|url\(/);
  });

  it("uses the tan-400 token class", () => {
    const { container } = render(<CordDivider />);

    expect(container.querySelector(".text-tan-400")).not.toBeNull();
  });

  it("draws two strands with pathLength 1 and a knot at each end", () => {
    const { container } = render(<CordDivider />);
    const strands = container.querySelectorAll("path");
    const knots = [...container.querySelectorAll("circle")];

    expect(strands).toHaveLength(2);
    for (const strand of strands) {
      expect(strand).toHaveAttribute("pathLength", "1");
    }
    expect(strands[0]).toHaveClass("motif-cord-a");
    expect(strands[1]).toHaveClass("motif-cord-b");
    expect(knots.map((knot) => knot.getAttribute("cx"))).toEqual(["6", "314"]);
  });
});

describe("twinedStrand", () => {
  it("starts at x 12, ends at x 308 and repeats every 30 px", () => {
    const a = segments(twinedStrand(0));
    const b = segments(twinedStrand(1));

    expect(twinedStrand(0)).toMatch(/^M12 12 /);
    expect(twinedStrand(1)).toMatch(/^M12 12 /);
    expect(a.at(-1)?.ex).toBe(308);
    expect(b.at(-1)?.ex).toBe(308);
    expect(a[0]?.ex).toBe(27);
    // Full 15 px segments, then one shorter closing segment.
    expect(a.slice(0, -1).map((s) => s.ex - s.from)).toEqual(
      Array(a.length - 1).fill(15),
    );
    // Segment k + 2 is segment k shifted by 30 px.
    expect(a[2]?.from).toBe(42);
    expect(a[2]?.c1x).toBe((a[0]?.c1x ?? 0) + 30);
    expect(a[2]?.c1y).toBe(a[0]?.c1y);
    expect(a[2]?.ex).toBe((a[0]?.ex ?? 0) + 30);
    // The two strands mirror each other around the axis y = 12.
    expect(b[0]?.c1y).toBe(24 - (a[0]?.c1y ?? 0));
  });
});

describe("Butterfly", () => {
  it("is aria-hidden, pointer-events-none and absolutely positioned", () => {
    const { container } = render(<Butterfly />);
    const root = container.firstElementChild;

    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).not.toHaveAttribute("tabindex");
    expect(root).toHaveClass("pointer-events-none", "absolute", "motif-flight");
    expect(container.querySelector("svg")).toHaveAttribute(
      "focusable",
      "false",
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("wings carry motif-wing-left and motif-wing-right", () => {
    const { container } = render(<Butterfly />);

    expect(
      container.querySelector("g.motif-wing.motif-wing-left"),
    ).not.toBeNull();
    expect(
      container.querySelector("g.motif-wing.motif-wing-right"),
    ).not.toBeNull();
  });

  it("is small on phones and larger from lg", () => {
    const { container } = render(<Butterfly />);

    expect(container.firstElementChild).toHaveClass("size-7", "lg:size-10");
  });
});

describe("Butterfly sizes", () => {
  it.each([
    ["lg", ["size-30", "lg:size-44"]],
    ["xl", ["size-40", "lg:size-56"]],
  ] as const)(
    "the %s variant is 120 to 224 px and keeps the flight and wings",
    (size, classes) => {
      const { container } = render(<Butterfly size={size} />);

      expect(container.firstElementChild).toHaveClass(
        "motif-flight",
        ...classes,
      );
      expect(container.firstElementChild).toHaveAttribute("data-size", size);
      expect(container.querySelectorAll("g.motif-wing")).toHaveLength(2);
    },
  );

  it("takes its own placement and drops the default corner anchor", () => {
    const { container } = render(
      <Butterfly size="lg" className="left-4 top-4" />,
    );

    expect(container.firstElementChild).toHaveClass("left-4", "top-4");
    expect(container.firstElementChild).not.toHaveClass("-top-5", "right-6");
  });

  it("keeps the small default", () => {
    const { container } = render(<Butterfly />);

    expect(container.firstElementChild).toHaveAttribute("data-size", "sm");
  });
});

describe("BotanicalSprig", () => {
  it.each([
    ["sm", "size-15"],
    ["md", "size-25"],
    ["lg", "size-37.5"],
  ] as const)("the %s size is %s (60 to 150 px)", (size, cls) => {
    const { container } = render(<BotanicalSprig size={size} />);

    expect(container.firstElementChild).toHaveClass(cls);
    expect(container.firstElementChild).toHaveAttribute("data-size", size);
  });

  it.each(["olive", "sage", "wheat"] as const)(
    "the %s variant is a decorative inline svg with no text or request",
    (variant) => {
      const { container } = render(<BotanicalSprig variant={variant} />);
      const root = container.firstElementChild;

      expect(root).toHaveAttribute("aria-hidden", "true");
      expect(root).toHaveClass("pointer-events-none");
      expect(root).toHaveAttribute("data-variant", variant);
      expect(container.querySelector("svg")).toHaveAttribute(
        "focusable",
        "false",
      );
      expect(container.querySelectorAll("path").length).toBeGreaterThan(4);
      expect(container.textContent).toBe("");
      expect(container.innerHTML).not.toMatch(/href=|src=|url\(/);
    },
  );

  it("the three variants draw different sprigs", () => {
    const drawn = (["olive", "sage", "wheat"] as const).map(
      (variant) =>
        render(<BotanicalSprig variant={variant} />).container.innerHTML,
    );

    expect(new Set(drawn).size).toBe(3);
  });

  it("draws light stems for dark bands", () => {
    const { container } = render(<BotanicalSprig light />);

    expect(container.firstElementChild).toHaveClass("text-sand-200");
    expect(container.firstElementChild).not.toHaveClass("text-olive-800");
  });

  it("takes a placement class", () => {
    const { container } = render(<BotanicalSprig className="rotate-12" />);

    expect(container.firstElementChild).toHaveClass("rotate-12");
  });
});
