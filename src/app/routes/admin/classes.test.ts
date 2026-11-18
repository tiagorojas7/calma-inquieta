import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import routes from "~/app/routes";
import { loader } from "./classes";

function childrenOfAdmin(): { path?: string; file: string }[] {
  const admin = (
    routes as unknown as {
      path?: string;
      children?: { path?: string; file: string }[];
    }[]
  ).find((entry) => entry.path === "admin");
  return admin?.children ?? [];
}

describe("admin classes route", () => {
  it("is registered under /admin as clases", () => {
    expect(childrenOfAdmin()).toContainEqual(
      expect.objectContaining({
        path: "clases",
        file: "routes/admin/classes.tsx",
      }),
    );
  });

  it("lets an admin in", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/clases"),
          params: {},
          context: adminContext(),
        } as never),
      ),
    ).toBeNull();
  });

  it("refuses anyone who is not an admin", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/clases"),
          params: {},
          context: adminContext({}, { admin: false }),
        } as never),
      ),
    ).toBe(403);
  });
});
