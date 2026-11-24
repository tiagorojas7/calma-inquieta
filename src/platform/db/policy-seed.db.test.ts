import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";

const PRIVACY_BASE =
  "Usamos tus datos (nombre, correo electrónico y teléfono) solo para gestionar tu inscripción y para escribirte sobre ella. No los compartimos con terceros. Si querés corregirlos, escribinos.";

const INSERT_VERSION = `
  INSERT INTO policy_version (id, kind, version, body, published_at, published_by)
  VALUES (gen_random_uuid(), $1, $2, $3, now(), 'owner@example.com')`;

const INSERT_REQUEST = `
  INSERT INTO intensive_seat_request (
    id, public_id, intensive_id, status, full_name, email, phone_digits,
    policy_accepted_at, created_at, conditions_version, privacy_version
  ) VALUES (
    $1, $2, '00000000-0000-4000-8000-0000000000c1', 'pending_confirmation',
    'Bea Gomez', $3, '5493515550002', now(), now(), $4, $5
  )`;

describe("policy_version", () => {
  const database = createTestDatabase();
  let client: pg.Client;

  beforeAll(async () => {
    const { url } = await database;
    client = new pg.Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await (await database).drop();
  });

  it("seeds exactly one first version of each document, published by the migration", async () => {
    const { rows } = await client.query<{
      kind: string;
      version: number;
      published_by: string;
    }>(
      "SELECT kind, version, published_by FROM policy_version ORDER BY kind, version",
    );

    expect(rows).toEqual([
      { kind: "conditions", version: 1, published_by: "migration 0018" },
      { kind: "privacy", version: 1, published_by: "migration 0018" },
    ]);
  });

  it("seeds the privacy text exactly and a conditions text built from what the site already says", async () => {
    const { rows } = await client.query<{ kind: string; body: string }>(
      "SELECT kind, body FROM policy_version ORDER BY kind",
    );
    const bodies = Object.fromEntries(rows.map((row) => [row.kind, row.body]));

    expect(bodies.privacy).toBe(PRIVACY_BASE);
    const conditions = bodies.conditions ?? "";
    expect(conditions.split("\n\n")).toHaveLength(5);
    expect(conditions).toContain("único pago");
    expect(conditions).toContain("pendiente hasta que confirmamos el pago");
    expect(conditions).toContain("recuperar una clase en otro turno");
    expect(conditions).toContain("la seña asegura tu lugar");
    expect(conditions).toContain("Si no se alcanza el mínimo de personas");
    expect(conditions).toContain("sus propias condiciones");
  });

  it("rejects an unknown kind, a version below 1 and a blank body", async () => {
    await expect(
      client.query(INSERT_VERSION, ["other", 1, "x"]),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "policy_version_kind_check",
    });
    await expect(
      client.query(INSERT_VERSION, ["conditions", 0, "x"]),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "policy_version_version_check",
    });
    await expect(
      client.query(INSERT_VERSION, ["conditions", 2, "   \n "]),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "policy_version_body_check",
    });
  });

  it("rejects a second row for the same kind and version, and numbers each kind on its own", async () => {
    await expect(
      client.query(INSERT_VERSION, ["conditions", 1, "otra"]),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "policy_version_kind_version_unique",
    });

    await client.query(INSERT_VERSION, [
      "conditions",
      2,
      "Nuevas condiciones.",
    ]);
    await client.query(INSERT_VERSION, ["privacy", 2, "Nueva privacidad."]);
    const { rows } = await client.query<{ kind: string; version: number }>(
      "SELECT kind, version FROM policy_version ORDER BY kind, version",
    );
    expect(rows).toEqual([
      { kind: "conditions", version: 1 },
      { kind: "conditions", version: 2 },
      { kind: "privacy", version: 1 },
      { kind: "privacy", version: 2 },
    ]);
  });

  describe("accepted versions on a workshop seat request", () => {
    it("stores both versions or none", async () => {
      await client.query(INSERT_REQUEST, [
        "00000000-0000-4000-8000-0000000000b1",
        "request_both_0000001",
        "both@example.com",
        1,
        1,
      ]);
      await client.query(INSERT_REQUEST, [
        "00000000-0000-4000-8000-0000000000b2",
        "request_none_0000001",
        "none@example.com",
        null,
        null,
      ]);

      const { rows } = await client.query<{
        email: string;
        conditions_version: number | null;
        privacy_version: number | null;
      }>(
        "SELECT email, conditions_version, privacy_version FROM intensive_seat_request ORDER BY email",
      );
      expect(rows).toEqual([
        {
          email: "both@example.com",
          conditions_version: 1,
          privacy_version: 1,
        },
        {
          email: "none@example.com",
          conditions_version: null,
          privacy_version: null,
        },
      ]);
    });

    it("rejects exactly one of the two versions", async () => {
      await expect(
        client.query(INSERT_REQUEST, [
          "00000000-0000-4000-8000-0000000000b3",
          "request_half_0000001",
          "half@example.com",
          1,
          null,
        ]),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "intensive_seat_request_acceptance_check",
      });
      await expect(
        client.query(INSERT_REQUEST, [
          "00000000-0000-4000-8000-0000000000b4",
          "request_half_0000002",
          "half2@example.com",
          null,
          2,
        ]),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "intensive_seat_request_acceptance_check",
      });
    });
  });
});
