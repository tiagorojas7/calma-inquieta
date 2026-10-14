import { describe, expect, it, vi } from "vitest";
import { createAccessKeyCacheCell } from "~/modules/admin-access/infrastructure/access-verifier";
import { isAdminPath, runAdminGate } from "./admin-gate";

describe("isAdminPath", () => {
  it.each([
    "/admin",
    "/ADMIN",
    "/%61dmin",
    "https://calma.test//admin",
    "/admin.data",
    "/admin/x.data",
    "/%",
  ])("fails closed for %s", (pathname) => {
    expect(isAdminPath(new URL(pathname, "https://calma.test"))).toBe(true);
  });

  it.each(["/", "/status", "/user", "/x/admin"])(
    "leaves public path %s outside the gate",
    (pathname) => {
      expect(isAdminPath(new URL(pathname, "https://calma.test"))).toBe(false);
    },
  );
});

describe("runAdminGate", () => {
  const devConfig = {
    access: null,
    adminEmails: ["owner@example.test"],
    devAdminEmail: "owner@example.test",
    issues: [],
  };

  it("denies a cross-origin mutation before authorization and logs only its reason", async () => {
    const token = "secret-access-token";
    const email = "owner@example.test";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await runAdminGate(
      new Request("https://calma.example.test/admin/posts", {
        method: "POST",
        headers: {
          Origin: "https://evil.example.test",
          "Cf-Access-Jwt-Assertion": token,
        },
      }),
      devConfig,
      { accessKeys: createAccessKeyCacheCell() },
    );

    expect(result).toEqual({
      kind: "denied",
      mode: "plain",
      adminAccess: { kind: "denied", identityEmail: null },
    });
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "admin access denied: cross-origin",
    );
    expect(warn.mock.calls.flat().join(" ")).not.toContain(token);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(email);
  });

  it.each(["/ADMIN.DATA", "/%61dmin%2Edata"])(
    "denies normalized admin data path %s as plain instead of redispatching it",
    async (pathname) => {
      const result = await runAdminGate(
        new Request(`https://calma.example.test${pathname}`),
        devConfig,
        { accessKeys: createAccessKeyCacheCell() },
      );

      expect(result).toEqual({
        kind: "denied",
        mode: "plain",
        adminAccess: { kind: "denied", identityEmail: null },
      });
    },
  );

  it("propagates an admitted actor through the gate contract", async () => {
    const result = await runAdminGate(
      new Request("https://calma.example.test/admin"),
      devConfig,
      { accessKeys: createAccessKeyCacheCell() },
    );

    expect(result).toEqual({
      kind: "allowed",
      adminAccess: {
        kind: "admin",
        actor: { kind: "admin-actor", email: "owner@example.test" },
      },
    });
  });

  it("labels an exception without config issues as unexpected", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await runAdminGate(
      new Request("https://calma.example.test/admin"),
      { ...devConfig, adminEmails: null as unknown as string[] },
      { accessKeys: createAccessKeyCacheCell() },
    );

    expect(result).toMatchObject({ kind: "denied" });
    expect(warn).toHaveBeenCalledWith("admin access unexpected error");
  });
});
