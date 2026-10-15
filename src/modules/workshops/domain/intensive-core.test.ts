import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  assignmentPercentage,
  checkTransition,
  cordobaLocalOf,
  startsInFuture,
  unmetPublishRules,
  validateIntensiveCore,
  validateSchedule,
  type IntensiveCoreDraft,
  type IntensiveLifecycle,
  type PublishFacts,
} from "./intensive-core";

const draft = (
  overrides: Partial<IntensiveCoreDraft> = {},
): IntensiveCoreDraft => ({
  name: "Cerámica de fin de semana",
  slug: "ceramica-fin-de-semana",
  summary: "Un día de torno",
  description: "Descripción larga",
  eventDate: "2026-11-07",
  startsAt: "10:00",
  endsAt: "18:00",
  price: "30000",
  deposit: "10000",
  capacity: "8",
  minSeats: "4",
  policyText: "Cancelación hasta 48 horas antes.",
  materialsIncluded: false,
  ...overrides,
});

const issuesOf = (overrides: Partial<IntensiveCoreDraft>) => {
  const result = validateIntensiveCore(draft(overrides));
  return result.ok ? [] : result.error.issues;
};

/** Money hides its field from toEqual, so tests compare centavos. */
const centavosOf = (result: ReturnType<typeof validateIntensiveCore>) =>
  result.ok
    ? [result.value.price.toCentavos(), result.value.deposit.toCentavos()]
    : [];

const pesos = (amount: number) => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad money");
  return money.value;
};

describe("validateIntensiveCore", () => {
  it("converts whole pesos to exact centavos", () => {
    expect(centavosOf(validateIntensiveCore(draft()))).toEqual([
      3_000_000, 1_000_000,
    ]);
    expect(
      centavosOf(
        validateIntensiveCore(draft({ price: " 30000 ", deposit: " 007 " })),
      ),
    ).toEqual([3_000_000, 700]);
  });

  it("accepts a valid draft and exposes money as Money", () => {
    const result = validateIntensiveCore(draft());
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Cerámica de fin de semana",
        slug: "ceramica-fin-de-semana",
        summary: "Un día de torno",
        description: "Descripción larga",
        schedule: {
          eventDate: "2026-11-07",
          startsAt: "10:00",
          endsAt: "18:00",
        },
        price: pesos(30000),
        deposit: pesos(10000),
        capacity: 8,
        minSeats: 4,
        policyText: "Cancelación hasta 48 horas antes.",
        materialsIncluded: false,
      },
    });
  });

  it("trims every text and numeric field", () => {
    const result = validateIntensiveCore(
      draft({
        name: "  Torno  ",
        slug: "  torno  ",
        summary: "  Resumen ",
        description: "\n Larga \n",
        eventDate: " 2026-11-07 ",
        startsAt: " 10:00 ",
        endsAt: " 18:00 ",
        price: " 30000 ",
        deposit: " 10000 ",
        capacity: " 8 ",
        minSeats: " 4 ",
        policyText: "  Política  ",
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        name: "Torno",
        slug: "torno",
        summary: "Resumen",
        description: "Larga",
        schedule: {
          eventDate: "2026-11-07",
          startsAt: "10:00",
          endsAt: "18:00",
        },
        price: pesos(30000),
        deposit: pesos(10000),
        capacity: 8,
        minSeats: 4,
        policyText: "Política",
      },
    });
  });

  it("stores an empty policy text as empty", () => {
    expect(validateIntensiveCore(draft({ policyText: "   " }))).toMatchObject({
      ok: true,
      value: { policyText: "" },
    });
  });

  it("names every blank required field", () => {
    expect(
      issuesOf({
        name: " ",
        slug: "",
        summary: "",
        description: " ",
        eventDate: "",
        startsAt: "",
        price: "",
        deposit: "",
        capacity: "",
        minSeats: "",
      }),
    ).toEqual([
      { field: "name", code: "required" },
      { field: "slug", code: "required" },
      { field: "summary", code: "required" },
      { field: "description", code: "required" },
      { field: "eventDate", code: "required" },
      { field: "timeRange", code: "required" },
      { field: "price", code: "required" },
      { field: "deposit", code: "required" },
      { field: "capacity", code: "required" },
      { field: "minSeats", code: "required" },
    ]);
  });

  it.each([
    ["name", { name: "x".repeat(121) }],
    ["slug", { slug: "x".repeat(81) }],
    ["summary", { summary: "x".repeat(201) }],
    ["description", { description: "x".repeat(5001) }],
    ["policyText", { policyText: "x".repeat(2001) }],
  ] as const)("refuses a %s over its limit", (field, overrides) => {
    expect(issuesOf(overrides)).toEqual([{ field, code: "too-long" }]);
  });

  it("accepts every text exactly at its limit", () => {
    expect(
      validateIntensiveCore(
        draft({
          name: "x".repeat(120),
          slug: "x".repeat(80),
          summary: "x".repeat(200),
          description: "x".repeat(5000),
          policyText: "x".repeat(2000),
        }),
      ).ok,
    ).toBe(true);
  });

  it.each(["Torno", "torno_1", "-torno", "torno-", "to  rno", "tórno", "a--b"])(
    "refuses the slug %j",
    (slug) => {
      expect(issuesOf({ slug })).toEqual([
        { field: "slug", code: "invalid-format" },
      ]);
    },
  );

  describe("price and deposit", () => {
    it("accepts a deposit below and equal to the price", () => {
      expect(validateIntensiveCore(draft({ deposit: "29999" })).ok).toBe(true);
      expect(validateIntensiveCore(draft({ deposit: "30000" })).ok).toBe(true);
    });

    it("refuses a deposit above the price", () => {
      expect(issuesOf({ deposit: "30001" })).toEqual([
        { field: "deposit", code: "exceeds-price" },
      ]);
    });

    it("refuses a price lowered below the deposit", () => {
      expect(issuesOf({ price: "8000" })).toEqual([
        { field: "deposit", code: "exceeds-price" },
      ]);
    });

    it("refuses a zero deposit and a zero price", () => {
      expect(issuesOf({ deposit: "0" })).toEqual([
        { field: "deposit", code: "out-of-range" },
      ]);
      expect(issuesOf({ price: "0", deposit: "5" })).toEqual([
        { field: "price", code: "out-of-range" },
        { field: "deposit", code: "exceeds-price" },
      ]);
    });

    it.each(["12.5", "-5", "1e3", "abc", "1 000"])(
      "refuses the amount %j as an invalid format",
      (price) => {
        expect(issuesOf({ price, deposit: "5" })).toEqual([
          { field: "price", code: "invalid-format" },
        ]);
      },
    );

    it("refuses an amount beyond the safe range", () => {
      expect(issuesOf({ price: "99999999999999999999", deposit: "5" })).toEqual(
        [{ field: "price", code: "out-of-range" }],
      );
    });

    it("skips the comparison when the price itself is invalid", () => {
      expect(issuesOf({ price: "", deposit: "999999" })).toEqual([
        { field: "price", code: "required" },
      ]);
    });
  });

  describe("capacity and minimum seats", () => {
    it("accepts equal values and the 1 to 500 bounds", () => {
      expect(
        validateIntensiveCore(draft({ capacity: "8", minSeats: "8" })).ok,
      ).toBe(true);
      expect(
        validateIntensiveCore(draft({ capacity: "500", minSeats: "1" })).ok,
      ).toBe(true);
    });

    it("refuses minimum seats above the capacity", () => {
      expect(issuesOf({ capacity: "8", minSeats: "9" })).toEqual([
        { field: "minSeats", code: "exceeds-capacity" },
      ]);
    });

    it("refuses zero and an excessive capacity", () => {
      expect(issuesOf({ capacity: "0", minSeats: "1" })).toEqual([
        { field: "capacity", code: "out-of-range" },
      ]);
      expect(issuesOf({ capacity: "501", minSeats: "1" })).toEqual([
        { field: "capacity", code: "out-of-range" },
      ]);
    });

    it("refuses zero minimum seats", () => {
      expect(issuesOf({ minSeats: "0" })).toEqual([
        { field: "minSeats", code: "out-of-range" },
      ]);
    });

    it.each(["3.5", "-2", "two", "٣"])("refuses %j as a count", (value) => {
      expect(issuesOf({ capacity: value, minSeats: "1" })).toEqual([
        { field: "capacity", code: "invalid-format" },
      ]);
      expect(issuesOf({ minSeats: value })).toEqual([
        { field: "minSeats", code: "invalid-format" },
      ]);
    });

    it("skips the seat comparison when the capacity is invalid", () => {
      expect(issuesOf({ capacity: "x", minSeats: "99" })).toEqual([
        { field: "capacity", code: "invalid-format" },
      ]);
    });
  });
});

describe("validateSchedule", () => {
  const check = (eventDate: string, startsAt: string, endsAt: string) =>
    validateSchedule({ eventDate, startsAt, endsAt });

  it("accepts one date with an ordered time range, trimmed", () => {
    expect(check(" 2026-11-07 ", " 09:30 ", " 13:00 ")).toEqual({
      ok: true,
      value: { eventDate: "2026-11-07", startsAt: "09:30", endsAt: "13:00" },
    });
  });

  it("refuses an end equal to or before the start", () => {
    for (const end of ["10:00", "09:59"])
      expect(check("2026-11-07", "10:00", end)).toEqual({
        ok: false,
        error: {
          kind: "invalid",
          issues: [{ field: "timeRange", code: "end-before-start" }],
        },
      });
  });

  it.each([
    "2026-02-30",
    "2026-13-01",
    "2026-1-1",
    "07/11/2026",
    "2026-11-07T10:00",
  ])("refuses the date %j", (eventDate) => {
    expect(check(eventDate, "10:00", "12:00")).toMatchObject({
      ok: false,
      error: { issues: [{ field: "eventDate", code: "invalid-format" }] },
    });
  });

  it("accepts a leap day only in a leap year", () => {
    expect(check("2028-02-29", "10:00", "12:00").ok).toBe(true);
    expect(check("2027-02-29", "10:00", "12:00").ok).toBe(false);
  });

  it.each(["24:00", "10:60", "9:00", "10", "10:00:00", "ab:cd"])(
    "refuses the time %j",
    (time) => {
      expect(check("2026-11-07", time, "23:59")).toMatchObject({
        ok: false,
        error: { issues: [{ field: "timeRange", code: "invalid-format" }] },
      });
    },
  );

  it("reports a bad date and a bad range together", () => {
    expect(check("nope", "12:00", "11:00")).toMatchObject({
      error: {
        issues: [
          { field: "eventDate", code: "invalid-format" },
          { field: "timeRange", code: "end-before-start" },
        ],
      },
    });
  });
});

describe("cordobaLocalOf and startsInFuture", () => {
  it("reads the Córdoba wall clock around the UTC midnight", () => {
    expect(cordobaLocalOf(new Date("2026-10-14T02:59:00Z"))).toEqual({
      date: "2026-10-13",
      time: "23:59",
    });
    expect(cordobaLocalOf(new Date("2026-10-14T03:00:00Z"))).toEqual({
      date: "2026-10-14",
      time: "00:00",
    });
  });

  const schedule = {
    eventDate: "2026-11-07",
    startsAt: "10:00",
    endsAt: "18:00",
  };

  it("requires a start strictly after the current Córdoba minute", () => {
    expect(startsInFuture(schedule, new Date("2026-11-07T12:59:00Z"))).toBe(
      true,
    );
    expect(startsInFuture(schedule, new Date("2026-11-07T13:00:00Z"))).toBe(
      false,
    );
    expect(startsInFuture(schedule, new Date("2026-11-07T13:00:59Z"))).toBe(
      false,
    );
    expect(startsInFuture(schedule, new Date("2026-11-07T13:01:00Z"))).toBe(
      false,
    );
  });

  it("compares dates before times", () => {
    expect(startsInFuture(schedule, new Date("2026-11-06T23:00:00Z"))).toBe(
      true,
    );
    expect(startsInFuture(schedule, new Date("2026-11-08T03:00:00Z"))).toBe(
      false,
    );
  });
});

describe("assignmentPercentage", () => {
  it("takes the percentage of a third-party teacher exactly", () => {
    expect(
      assignmentPercentage("third_party", { kind: "value", basisPoints: 3550 }),
    ).toEqual({ ok: true, value: 3550 });
    expect(
      assignmentPercentage("third_party", { kind: "value", basisPoints: 0 }),
    ).toEqual({ ok: true, value: 0 });
  });

  it("requires a percentage from a third-party teacher", () => {
    expect(assignmentPercentage("third_party", { kind: "blank" })).toEqual({
      ok: false,
      error: { field: "percentage", code: "required" },
    });
  });

  it("passes on the parse failure of a third-party percentage", () => {
    for (const code of [
      "invalid-format",
      "out-of-range",
      "too-many-decimals",
    ] as const)
      expect(
        assignmentPercentage("third_party", { kind: "invalid", code }),
      ).toEqual({
        ok: false,
        error: { field: "percentage", code },
      });
  });

  it("stores no percentage for an own teacher and refuses one", () => {
    expect(assignmentPercentage("own", { kind: "blank" })).toEqual({
      ok: true,
      value: null,
    });
    for (const submission of [
      { kind: "value", basisPoints: 5000 },
      { kind: "invalid", code: "out-of-range" },
    ] as const)
      expect(assignmentPercentage("own", submission)).toEqual({
        ok: false,
        error: { field: "percentage", code: "percentage-not-applicable" },
      });
  });
});

describe("checkTransition", () => {
  const all: IntensiveLifecycle[] = [
    "draft",
    "published",
    "paused",
    "cancelled",
    "archived",
  ];
  const allowed = new Set([
    "draft>published",
    "published>paused",
    "paused>published",
    "published>cancelled",
    "paused>cancelled",
    "draft>archived",
    "published>archived",
    "paused>archived",
    "cancelled>archived",
    "archived>draft",
  ]);

  it.each(all.flatMap((from) => all.map((to) => [from, to] as const)))(
    "%s to %s follows the transition table",
    (from, to) => {
      const result = checkTransition(from, to);
      if (allowed.has(`${from}>${to}`))
        expect(result).toEqual({ ok: true, value: to });
      else
        expect(result).toEqual({
          ok: false,
          error: { kind: "transition-refused", from, to },
        });
    },
  );
});

describe("unmetPublishRules", () => {
  const facts = (overrides: Partial<PublishFacts> = {}): PublishFacts => ({
    name: "Torno",
    slug: "torno",
    schedule: { eventDate: "2026-11-07", startsAt: "10:00", endsAt: "18:00" },
    price: pesos(30000),
    deposit: pesos(10000),
    capacity: 8,
    minSeats: 4,
    assignment: { active: true, modality: "third_party", percentageBp: 5000 },
    ...overrides,
  });

  it("lists nothing for a complete intensivo", () => {
    expect(unmetPublishRules(facts())).toEqual([]);
    expect(
      unmetPublishRules(
        facts({
          assignment: { active: true, modality: "own", percentageBp: null },
        }),
      ),
    ).toEqual([]);
  });

  it("names a missing or archived teacher alone", () => {
    expect(unmetPublishRules(facts({ assignment: null }))).toEqual(["teacher"]);
    expect(
      unmetPublishRules(
        facts({
          assignment: { active: false, modality: "own", percentageBp: null },
        }),
      ),
    ).toEqual(["teacher"]);
  });

  it("names a missing percentage of a third-party teacher", () => {
    expect(
      unmetPublishRules(
        facts({
          assignment: {
            active: true,
            modality: "third_party",
            percentageBp: null,
          },
        }),
      ),
    ).toEqual(["percentage"]);
  });

  it("names every unmet rule in a fixed order", () => {
    expect(
      unmetPublishRules(
        facts({
          name: " ",
          slug: "Bad Slug",
          schedule: {
            eventDate: "2026-11-07",
            startsAt: "18:00",
            endsAt: "10:00",
          },
          price: Money.zero(),
          deposit: pesos(1),
          capacity: 0,
          minSeats: 1,
          assignment: null,
        }),
      ),
    ).toEqual([
      "name",
      "slug",
      "teacher",
      "time-range",
      "price",
      "deposit",
      "capacity",
      "min-seats",
    ]);
  });

  it("flags a deposit above the price and minimum seats above the capacity", () => {
    expect(
      unmetPublishRules(facts({ deposit: pesos(30001), minSeats: 9 })),
    ).toEqual(["deposit", "min-seats"]);
    expect(
      unmetPublishRules(facts({ deposit: Money.zero(), minSeats: 0 })),
    ).toEqual(["deposit", "min-seats"]);
  });
});
