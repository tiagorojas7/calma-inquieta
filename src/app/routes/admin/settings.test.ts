import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import routes from "~/app/routes";
import { loader } from "./settings";

function childrenOfAdmin(): { path?: string; file: string }[] {
  const admin = (
    routes as unknown as {
      path?: string;
      children?: { path?: string; file: string }[];
    }[]
  ).find((entry) => entry.path === "admin");
  return admin?.children ?? [];
}

describe("admin settings route", () => {
  it("is registered under /admin as ajustes", () => {
    expect(childrenOfAdmin()).toContainEqual(
      expect.objectContaining({
        path: "ajustes",
        file: "routes/admin/settings.tsx",
      }),
    );
  });

  it("lets an admin in", async () => {
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/ajustes"),
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
          request: getRequest("/admin/ajustes"),
          params: {},
          context: adminContext({}, { admin: false }),
        } as never),
      ),
    ).toBe(403);
  });
});
