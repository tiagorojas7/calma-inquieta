import { describe, expect, it } from "vitest";
import { readAdminConfig } from "./admin-env";

describe("readAdminConfig", () => {
  it("fails closed for a malformed Access team domain without retaining its value", () => {
    const domain = "cloudflareaccess.com.attacker.test";
    const config = readAdminConfig({
      ACCESS_TEAM_DOMAIN: domain,
      ACCESS_AUD: "a".repeat(64),
      ADMIN_EMAILS: "owner@example.test",
    });

    expect(config.access).toBeNull();
    expect(config.issues).toEqual([
      { name: "ACCESS_TEAM_DOMAIN", reason: "invalid" },
    ]);
    expect(JSON.stringify(config)).not.toContain(domain);
  });

  it.each([
    ["ACCESS_TEAM_DOMAIN", { ACCESS_TEAM_DOMAIN: 42 }],
    ["ACCESS_AUD", { ACCESS_AUD: 42 }],
    ["ADMIN_EMAILS", { ADMIN_EMAILS: ["owner@example.test"] }],
    ["DEV_ADMIN_EMAIL", { DEV_ADMIN_EMAIL: { email: "owner@example.test" } }],
  ] as const)(
    "reports a non-string %s by name only and fails closed",
    (name, malformed) => {
      const config = readAdminConfig({
        ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
        ACCESS_AUD: "a".repeat(64),
        ...malformed,
      });

      expect(config.issues).toEqual([{ name, reason: "invalid" }]);
      expect(JSON.stringify(config.issues)).not.toContain("42");
      expect(config.access).toEqual(
        name.startsWith("ACCESS_")
          ? null
          : {
              teamDomain: "team.cloudflareaccess.com",
              audience: "a".repeat(64),
            },
      );
    },
  );

  it("treats whitespace-only admin values as unset", () => {
    expect(
      readAdminConfig({
        ACCESS_TEAM_DOMAIN: " ",
        ACCESS_AUD: "\t",
        ADMIN_EMAILS: "\n",
        DEV_ADMIN_EMAIL: " ",
      }),
    ).toEqual({
      access: null,
      adminEmails: [],
      devAdminEmail: null,
      issues: [],
    });
  });

  it("keeps only valid, normalized allowlist entries and reports each invalid name once", () => {
    const config = readAdminConfig({
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
      ACCESS_AUD: "a".repeat(64),
      ADMIN_EMAILS:
        " Owner@Example.test, invalid, INVALID \\nowner@example.test ",
      DEV_ADMIN_EMAIL: " ",
    });

    expect(config).toEqual({
      access: {
        teamDomain: "team.cloudflareaccess.com",
        audience: "a".repeat(64),
      },
      adminEmails: ["owner@example.test"],
      devAdminEmail: null,
      issues: [{ name: "ADMIN_EMAILS", reason: "invalid" }],
    });
  });
});
