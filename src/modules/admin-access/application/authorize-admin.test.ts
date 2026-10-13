import { describe, expect, it } from "vitest";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { unsignedToken } from "~/testing/access/access-tokens";
import type {
  AccessSignatureVerifier,
  AdminAccessConfig,
  DecodedAccessToken,
  SignatureVerdict,
} from "../domain/access-authorization";
import { createAuthorizeAdminRequest } from "./authorize-admin";

const NOW = 1_700_000_000;
const clock = fixedClock(new Date(NOW * 1000));
const config: AdminAccessConfig = {
  access: { teamDomain: "team.cloudflareaccess.com", audience: "aud-1" },
  adminEmails: ["owner@example.com"],
  devAdminEmail: null,
  hasIssues: false,
};
const claims = {
  iss: "https://team.cloudflareaccess.com",
  aud: "aud-1",
  exp: NOW + 300,
  iat: NOW,
  email: "Owner@Example.com",
};
const token = (
  patch: Record<string, unknown> = {},
  header: unknown = { alg: "RS256", kid: "k1" },
) => unsignedToken(header, { ...claims, ...patch });

function setup(
  overrides: Partial<AdminAccessConfig> = {},
  verdict: SignatureVerdict | "throw" = "valid",
) {
  const seen: DecodedAccessToken[] = [];
  const signatures: AccessSignatureVerifier = {
    verify: (decoded) => {
      seen.push(decoded);
      return verdict === "throw"
        ? Promise.reject(new Error("boom"))
        : Promise.resolve(verdict);
    },
  };
  const authorize = createAuthorizeAdminRequest({
    config: { ...config, ...overrides },
    signatures,
    clock,
  });
  return { authorize, seen };
}
const denied = (reason: string, identityEmail: string | null = null) => ({
  kind: "denied",
  reason,
  identityEmail,
});

describe("createAuthorizeAdminRequest", () => {
  it("creates an actor from a verified, allowlisted token", async () => {
    const { authorize, seen } = setup();
    expect(await authorize({ assertion: token() })).toEqual({
      kind: "admin",
      actor: { kind: "admin-actor", email: "owner@example.com" },
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.header.kid).toBe("k1");
  });

  it.each([
    ["no Access config", { access: null }],
    ["empty allowlist", { adminEmails: [] }],
    ["blank-only allowlist", { adminEmails: ["", "   "] }],
  ])(
    "denies %s as config-missing, or config-invalid when issues were reported",
    async (_label, patch) => {
      const missing = setup(patch);
      expect(await missing.authorize({ assertion: token() })).toEqual(
        denied("config-missing"),
      );
      const invalid = setup({ ...patch, hasIssues: true });
      expect(await invalid.authorize({ assertion: token() })).toEqual(
        denied("config-invalid"),
      );
      expect(missing.seen.length + invalid.seen.length).toBe(0);
    },
  );

  it("does not deny on hasIssues alone when the configuration is usable", async () => {
    const { authorize } = setup({ hasIssues: true });
    expect((await authorize({ assertion: token() })).kind).toBe("admin");
  });

  it.each([null, "", "   "])(
    "denies a missing assertion (%j) as token-missing",
    async (assertion) => {
      const { authorize, seen } = setup();
      expect(await authorize({ assertion })).toEqual(denied("token-missing"));
      expect(seen).toHaveLength(0);
    },
  );

  it.each([
    ["not three segments", "a.b", "token-malformed"],
    ["HS256", token({}, { alg: "HS256", kid: "k1" }), "algorithm"],
    ["alg none", token({}, { alg: "none", kid: "k1" }), "algorithm"],
    [
      "wrong issuer",
      token({ iss: "https://evil.cloudflareaccess.com" }),
      "issuer",
    ],
    ["wrong audience", token({ aud: ["x"] }), "audience"],
    ["expired", token({ exp: NOW - 60 }), "expired"],
    ["not yet valid", token({ nbf: NOW + 61 }), "not-yet-valid"],
    ["no email", token({ email: undefined }), "no-email"],
    [
      "service token",
      token({ email: undefined, common_name: "svc" }),
      "service-token",
    ],
  ])(
    "denies %s as %s without asking the verifier",
    async (_label, assertion, reason) => {
      const { authorize, seen } = setup();
      expect(await authorize({ assertion })).toEqual(denied(reason));
      expect(seen).toHaveLength(0);
    },
  );

  it.each([
    ["invalid", "signature"],
    ["unknown-key", "unknown-key"],
    ["key-source", "key-source"],
    ["throw", "signature"],
  ] as const)(
    "maps verifier verdict %s to %s with no identity email",
    async (verdict, reason) => {
      const { authorize } = setup({}, verdict);
      expect(await authorize({ assertion: token() })).toEqual(denied(reason));
    },
  );

  it("denies an unlisted identity after verification and shows only the verified email", async () => {
    const { authorize } = setup({ adminEmails: ["someone@example.com"] });
    expect(
      await authorize({ assertion: token({ email: " Viewer@Example.com " }) }),
    ).toEqual(denied("not-allowlisted", "viewer@example.com"));
  });

  it("matches the allowlist case-insensitively and trimmed", async () => {
    const { authorize } = setup({ adminEmails: [" OWNER@example.COM "] });
    expect((await authorize({ assertion: token() })).kind).toBe("admin");
  });

  it("fails closed on a configuration of the wrong shape instead of throwing", async () => {
    const { authorize } = setup({
      adminEmails: undefined as unknown as string[],
    });
    expect(await authorize({ assertion: token() })).toEqual(
      denied("config-invalid"),
    );
  });

  describe("dev identity", () => {
    const dev = {
      devAdminEmail: " Dev@Example.com ",
      adminEmails: ["dev@example.com"],
    };
    it("admits a listed dev identity without Access config, a token or a signature check", async () => {
      const { authorize, seen } = setup({ ...dev, access: null });
      expect(await authorize({ assertion: null })).toEqual({
        kind: "admin",
        actor: { kind: "admin-actor", email: "dev@example.com" },
      });
      expect(
        await authorize({ assertion: token({ email: "other@example.com" }) }),
      ).toMatchObject({ kind: "admin", actor: { email: "dev@example.com" } });
      expect(seen).toHaveLength(0);
    });

    it("still applies the allowlist", async () => {
      const { authorize } = setup({
        ...dev,
        adminEmails: ["owner@example.com"],
      });
      expect(await authorize({ assertion: null })).toEqual(
        denied("not-allowlisted", "dev@example.com"),
      );
    });

    it("denies on an empty allowlist", async () => {
      const { authorize } = setup({ ...dev, adminEmails: [] });
      expect(await authorize({ assertion: null })).toEqual(
        denied("config-missing"),
      );
    });

    it("treats a blank dev identity as no bypass", async () => {
      const { authorize } = setup({ ...dev, devAdminEmail: "   " });
      expect(await authorize({ assertion: null })).toEqual(
        denied("token-missing"),
      );
    });
  });
});
