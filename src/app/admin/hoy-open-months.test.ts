import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { loadOpenMonthTasks } from "./hoy-open-months";

type Period = { id: string; period: string; status: string };

function services(
  workshops: readonly { id: string; name: string; status: string }[],
  byWorkshop: Record<
    string,
    { periods: Period[]; suggestedNext: string | null }
  >,
) {
  return {
    monthlyWorkshops: {
      list: () => Promise.resolve({ ok: true, value: workshops }),
    },
    workshopPeriods: {
      list: (_actor: unknown, id: string) =>
        Promise.resolve({
          ok: true,
          value: byWorkshop[id] ?? { periods: [], suggestedNext: null },
        }),
    },
  } as never;
}

const period = (month: string, status = "open"): Period => ({
  id: `p-${month}`,
  period: month,
  status,
});

describe("loadOpenMonthTasks", () => {
  const bordado = {
    id: "w-bordado",
    name: "bordado de canastas",
    status: "published",
  };
  const tejido = {
    id: "w-tejido",
    name: "tejido a dos manos",
    status: "published",
  };

  it("offers the month after the latest one, as Clases does", async () => {
    const tasks = await loadOpenMonthTasks(
      services([bordado], {
        "w-bordado": { periods: [period("2026-11")], suggestedNext: "2026-12" },
      }),
      testAdminActor(),
      "2026-12",
    );

    expect(tasks).toEqual([
      {
        workshopId: "w-bordado",
        workshopName: "bordado de canastas",
        period: "2026-12",
      },
    ]);
  });

  it("offers nothing for a taller whose latest month is a draft", async () => {
    const tasks = await loadOpenMonthTasks(
      services([bordado], {
        "w-bordado": {
          periods: [period("2026-11"), period("2026-12", "draft")],
          suggestedNext: "2027-01",
        },
      }),
      testAdminActor(),
      "2026-12",
    );

    expect(tasks).toEqual([]);
  });

  it("leaves out a month further ahead than Hoy looks", async () => {
    const tasks = await loadOpenMonthTasks(
      services([tejido], {
        "w-tejido": {
          periods: [period("2026-11"), period("2026-12")],
          suggestedNext: "2027-01",
        },
      }),
      testAdminActor(),
      "2026-12",
    );

    expect(tasks).toEqual([]);
  });

  it("degrades to no task when the workshops cannot be read", async () => {
    const failing = {
      monthlyWorkshops: { list: () => Promise.reject(new Error("db down")) },
      workshopPeriods: { list: () => Promise.reject(new Error("db down")) },
    } as never;

    expect(
      await loadOpenMonthTasks(failing, testAdminActor(), "2026-12"),
    ).toEqual([]);
  });
});
