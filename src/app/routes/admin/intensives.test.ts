import { describe, expect, it, vi } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { IntensivesService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { loader } from "./intensives";

const list = vi.fn(() =>
  Promise.resolve({
    ok: true as const,
    value: [
      {
        id: "i1",
        name: "Cerámica de sábado",
        assignment: {
          teacher: { id: "t1", name: "Ana Gómez", active: true },
          percentage: null,
        },
        status: "draft" as const,
        eventDate: "2026-10-10",
        startsAt: "10:00",
        endsAt: "13:00",
        capacity: 12,
      },
    ],
  }),
);
const FILTER_CASES = [
  ["borradores", "draft"],
  ["publicados", "published"],
  ["pausados", "paused"],
  ["cancelados", "cancelled"],
  ["archivados", "archived"],
] as const;

const actorFirstService = withOverrides(
  createUnavailableService<IntensivesService>(),
  { list: list as unknown as IntensivesService["list"] },
);

function call(query = "", admin = true) {
  return loader({
    request: getRequest(`/admin/intensivos${query}`),
    params: {},
    context: adminContext({ intensives: actorFirstService }, { admin }),
  } as never);
}

describe("admin intensives list loader", () => {
  it("lists live intensives with their local date, teacher, status and capacity", async () => {
    const result = await call();
    expect(result.filter).toBe("vigentes");
    expect(result.rows).toMatchObject([
      {
        id: "i1",
        name: "Cerámica de sábado",
        teacherName: "Ana Gómez",
        status: "draft",
        capacity: 12,
      },
    ]);
    expect(result.rows[0]?.dateTime).toContain("10");
  });

  for (const [estado, status] of FILTER_CASES) {
    it(`maps the ${estado} status filter`, async () => {
      await call(`?estado=${estado}`);
      expect(list).toHaveBeenCalledWith(expect.anything(), { status });
    });
  }

  it("denies a non-admin before any service call", async () => {
    list.mockClear();
    await expect(thrownStatus(() => call("", false))).resolves.toBe(403);
    expect(list).not.toHaveBeenCalled();
  });

  it("answers 503 when the service is unavailable", async () => {
    await expect(
      thrownStatus(() =>
        loader({
          request: getRequest("/admin/intensivos"),
          params: {},
          context: adminContext({
            intensives: createUnavailableService<IntensivesService>(),
          }),
        } as never),
      ),
    ).resolves.toBe(503);
  });
});
