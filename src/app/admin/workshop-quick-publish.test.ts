import { describe, expect, it } from "vitest";
import { err } from "~/modules/_shared";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { seedTeacher } from "~/testing/admin/workshop-seed";
import {
  FLOW_MONTH,
  FLOW_NEXT_MONTH,
  buildMaterial,
  workshopFlowFixture,
} from "~/testing/admin/workshop-flow-kit";
import { parseQuickWorkshop } from "./workshop-quick-form";
import { publishQuickWorkshop, openNextMonth } from "./workshop-quick-publish";

const actor = testAdminActor();

function input(fields: Record<string, string | string[]>) {
  const data = new FormData();
  const base: Record<string, string | string[]> = {
    name: "Cerámica Creativa",
    description: "Un taller para empezar de cero.",
    defaultFee: "12000",
    teacherId: "",
    percentage: "",
    intent: "publish",
    turnoWeekday: ["2", "", "", "", ""],
    turnoStartsAt: ["10:00", "", "", "", ""],
    turnoEndsAt: ["12:00", "", "", "", ""],
    turnoCapacity: ["8", "", "", "", ""],
    ...fields,
  };
  for (const [key, value] of Object.entries(base))
    for (const item of Array.isArray(value) ? value : [value])
      data.append(key, item);
  return parseQuickWorkshop(data);
}

async function fixture() {
  const flow = workshopFlowFixture([
    buildMaterial({ id: "m1", name: "Arcilla" }),
  ]);
  const teacherId = await seedTeacher(flow, { name: "Ana", modality: "own" });
  return { flow, teacherId };
}

function run(
  flow: Awaited<ReturnType<typeof fixture>>["flow"],
  parsed: ReturnType<typeof input>,
) {
  return publishQuickWorkshop(
    { monthlyWorkshops: flow.service, workshopPeriods: flow.periods },
    actor,
    parsed,
  );
}

describe("publishQuickWorkshop", () => {
  it("creates, adds turnos, publishes, opens the current month and publishes it", async () => {
    const { flow, teacherId } = await fixture();
    const outcome = await run(flow, input({ teacherId }));
    expect(outcome).toEqual({ kind: "published", id: "w1" });
    const workshop = [...flow.repository.items.values()][0];
    expect(workshop).toMatchObject({
      slug: "ceramica-creativa",
      status: "published",
      technique: "Taller",
    });
    const period = await flow.periods.get(actor, "w1", FLOW_MONTH);
    expect(period).toMatchObject({
      ok: true,
      value: {
        status: "open",
        turnos: [{ label: "Martes 10:00", capacity: 8 }],
      },
    });
  });

  it("sets the chosen materials on the month before publishing it", async () => {
    const { flow, teacherId } = await fixture();
    const outcome = await run(flow, input({ teacherId, materialIds: ["m1"] }));
    expect(outcome.kind).toBe("published");
    const period = await flow.periods.get(actor, "w1", FLOW_MONTH);
    expect(period).toMatchObject({
      ok: true,
      value: {
        status: "open",
        materialsRequired: true,
        materials: [{ id: "m1" }],
      },
    });
  });

  it("copies a third-party percentage into the month", async () => {
    const flow = workshopFlowFixture([
      buildMaterial({ id: "m1", name: "Arcilla" }),
    ]);
    const teacherId = await seedTeacher(flow, {
      name: "Beto",
      modality: "third_party",
    });
    const outcome = await run(
      flow,
      input({ teacherId, percentage: "35,5", materialIds: ["m1"] }),
    );
    expect(outcome.kind).toBe("published");
    expect(await flow.periods.get(actor, "w1", FLOW_MONTH)).toMatchObject({
      ok: true,
      value: {
        status: "open",
        snapshot: { percentage: { basisPoints: 3550 } },
      },
    });
  });

  it("saves only a draft, without turnos or months, for the draft intent", async () => {
    const { flow, teacherId } = await fixture();
    const outcome = await run(flow, input({ teacherId, intent: "draft" }));
    expect(outcome).toEqual({ kind: "saved", id: "w1" });
    expect([...flow.repository.items.values()][0]).toMatchObject({
      status: "draft",
    });
    const listed = await flow.periods.list(actor, "w1");
    expect(listed).toMatchObject({ ok: true, value: { periods: [] } });
  });

  it("still adds the turnos of a draft", async () => {
    const { flow, teacherId } = await fixture();
    await run(flow, input({ teacherId, intent: "draft" }));
    expect(await flow.service.get(actor, "w1")).toMatchObject({
      ok: true,
      value: { turnos: [{ label: "Martes 10:00" }] },
    });
  });

  it("gives a second taller with the same name a numeric suffix", async () => {
    const { flow, teacherId } = await fixture();
    await run(flow, input({ teacherId, intent: "draft" }));
    await run(flow, input({ teacherId, intent: "draft" }));
    await run(flow, input({ teacherId, intent: "draft" }));
    expect([...flow.repository.items.values()].map((w) => w.slug)).toEqual([
      "ceramica-creativa",
      "ceramica-creativa-2",
      "ceramica-creativa-3",
    ]);
  });

  it("reports field issues and stores nothing when the draft is invalid", async () => {
    const { flow } = await fixture();
    const outcome = await run(flow, input({ name: "  ", defaultFee: "0" }));
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid")
      expect(outcome.issues.map((issue) => issue.field).sort()).toEqual([
        "defaultFee",
        "name",
      ]);
    expect(flow.repository.items.size).toBe(0);
  });

  it("asks for a percentage when the teacher is third-party and none is typed", async () => {
    const flow = workshopFlowFixture();
    const teacherId = await seedTeacher(flow, {
      name: "Beto",
      modality: "third_party",
    });
    const outcome = await run(flow, input({ teacherId }));
    expect(outcome).toMatchObject({
      kind: "invalid",
      issues: [{ field: "percentage", code: "required" }],
    });
    expect(flow.repository.items.size).toBe(0);
  });

  it("asks for a turno before publishing and stores nothing", async () => {
    const { flow, teacherId } = await fixture();
    const outcome = await run(
      flow,
      input({
        teacherId,
        turnoWeekday: ["", "", "", "", ""],
        turnoStartsAt: ["", "", "", "", ""],
        turnoEndsAt: ["", "", "", "", ""],
        turnoCapacity: ["", "", "", "", ""],
      }),
    );
    expect(outcome).toEqual({ kind: "no-turnos" });
    expect(flow.repository.items.size).toBe(0);
  });

  it("leaves a draft and names the step when the taller cannot be published", async () => {
    const { flow } = await fixture();
    // No teacher: the domain refuses to publish, after create and turnos persisted.
    const outcome = await run(flow, input({ teacherId: "" }));
    expect(outcome).toEqual({ kind: "partial", id: "w1", step: "publish" });
    expect([...flow.repository.items.values()][0]).toMatchObject({
      status: "draft",
    });
  });

  it("leaves a published taller and names the step when the month cannot be opened", async () => {
    const { flow, teacherId } = await fixture();
    const outcome = await publishQuickWorkshop(
      {
        monthlyWorkshops: flow.service,
        workshopPeriods: {
          ...flow.periods,
          openMonth: () => Promise.resolve(err({ kind: "unavailable" })),
        },
      },
      actor,
      input({ teacherId }),
    );
    expect(outcome).toEqual({ kind: "partial", id: "w1", step: "month" });
    expect([...flow.repository.items.values()][0]).toMatchObject({
      status: "published",
    });
  });

  it("names the enroll step when the month opens but cannot be published", async () => {
    const { flow, teacherId } = await fixture();
    const outcome = await publishQuickWorkshop(
      {
        monthlyWorkshops: flow.service,
        workshopPeriods: {
          ...flow.periods,
          publish: () =>
            Promise.resolve(
              err({ kind: "transition-refused", from: "closed", to: "open" }),
            ),
        },
      },
      actor,
      input({ teacherId }),
    );
    expect(outcome).toEqual({ kind: "partial", id: "w1", step: "enroll" });
    expect(await flow.periods.get(actor, "w1", FLOW_MONTH)).toMatchObject({
      ok: true,
      value: { status: "draft" },
    });
  });
});

describe("openNextMonth", () => {
  it("opens the suggested month copying the previous one and publishes it", async () => {
    const { flow, teacherId } = await fixture();
    await run(flow, input({ teacherId, materialIds: ["m1"] }));
    const outcome = await openNextMonth(
      { monthlyWorkshops: flow.service, workshopPeriods: flow.periods },
      actor,
      "w1",
      FLOW_NEXT_MONTH,
    );
    expect(outcome).toEqual({ kind: "opened", period: FLOW_NEXT_MONTH });
    expect(await flow.periods.get(actor, "w1", FLOW_NEXT_MONTH)).toMatchObject({
      ok: true,
      value: {
        status: "open",
        materials: [{ id: "m1" }],
        materialsRequired: true,
        turnos: [{ capacity: 8 }],
      },
    });
  });

  it("reports the refusal without publishing when the month cannot open", async () => {
    const { flow } = await fixture();
    const outcome = await openNextMonth(
      { monthlyWorkshops: flow.service, workshopPeriods: flow.periods },
      actor,
      "w-missing",
      FLOW_NEXT_MONTH,
    );
    expect(outcome).toEqual({ kind: "failed", failure: { kind: "not-found" } });
  });

  it("refuses a month that is already open", async () => {
    const { flow, teacherId } = await fixture();
    await run(flow, input({ teacherId }));
    const outcome = await openNextMonth(
      { monthlyWorkshops: flow.service, workshopPeriods: flow.periods },
      actor,
      "w1",
      FLOW_MONTH,
    );
    expect(outcome).toEqual({ kind: "refused" });
  });
});
