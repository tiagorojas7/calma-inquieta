import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";
import { runMigrations } from "./migrate";

const INTENSIVE = "00000000-0000-4000-8000-0000000000a1";
const ASSET = "00000000-0000-4000-8000-0000000000b1";
const VARIANT = "00000000-0000-4000-8000-0000000000c1";
const SUPPLIER = "00000000-0000-4000-8000-0000000000d1";

let counter = 0;
const nextId = (): string =>
  `00000000-0000-4000-8000-${String(1000 + ++counter).padStart(12, "0")}`;

interface ProjectValues {
  readonly id?: string;
  readonly position?: number;
  readonly name?: string;
  readonly assetId?: string | null;
  readonly alt?: string | null;
  readonly price?: number;
  readonly deposit?: number;
}

const INSERT_PROJECT = `
  INSERT INTO intensive_project (
    id, intensive_id, position, name, media_asset_id, alt,
    price_centavos, deposit_centavos, updated_by, updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin@example.com', now())`;

function project(values: ProjectValues = {}): unknown[] {
  return [
    values.id ?? nextId(),
    INTENSIVE,
    values.position ?? 0,
    values.name ?? "Taza de torno",
    values.assetId ?? null,
    values.alt ?? null,
    values.price ?? 3000000,
    values.deposit ?? 1000000,
  ];
}

interface RequestValues {
  readonly id?: string;
  readonly status?: string;
  readonly projectId?: string | null;
  readonly price?: number | null;
  readonly deposit?: number | null;
  readonly balance?: number | null;
  readonly balancePaidOn?: string | null;
  readonly balanceBy?: string | null;
  readonly balanceAt?: Date | null;
}

const INSERT_REQUEST = `
  INSERT INTO intensive_seat_request (
    id, public_id, intensive_id, status, full_name, email, phone_digits,
    policy_accepted_at, created_at, paid_centavos, paid_on, project_id,
    price_centavos, deposit_centavos, balance_centavos, balance_paid_on,
    balance_by, balance_at
  ) VALUES (
    $1, $2, $3, $4, 'Ana Perez', $5, '5493515551234', now(), now(), $6, $7,
    $8, $9, $10, $11, $12, $13, $14
  )`;

function request(values: RequestValues = {}): unknown[] {
  const id = values.id ?? nextId();
  const confirmed = (values.status ?? "confirmed") === "confirmed";
  return [
    id,
    `req_${id.slice(-12)}`,
    INTENSIVE,
    values.status ?? "confirmed",
    `${id.slice(-12)}@example.com`,
    confirmed ? 1000000 : null,
    confirmed ? "2026-11-01" : null,
    values.projectId === undefined ? null : values.projectId,
    values.price === undefined ? 3000000 : values.price,
    values.deposit === undefined ? 1000000 : values.deposit,
    values.balance === undefined ? null : values.balance,
    values.balancePaidOn === undefined ? null : values.balancePaidOn,
    values.balanceBy === undefined ? null : values.balanceBy,
    values.balanceAt === undefined ? null : values.balanceAt,
  ];
}

describe("workshop project schema", () => {
  const database = createTestDatabase({ empty: true });
  let client: pg.Client;

  beforeAll(async () => {
    const { url } = await database;
    await runMigrations(url);
    client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(
      `INSERT INTO intensive_workshop (
         id, slug, name, summary, description, event_date, starts_at, ends_at,
         price_centavos, deposit_centavos, capacity, min_seats, policy_text,
         materials_included, status, updated_by, updated_at
       ) VALUES (
         $1, 'taller-uno', 'Taller uno', 's', 'd', '2026-12-05', '10:00',
         '14:00', 3000000, 1000000, 8, 1, 'p', true, 'draft',
         'admin@example.com', now()
       )`,
      [INTENSIVE],
    );
    await client.query(
      `INSERT INTO media_asset (
         id, storage_key, content_type, byte_size, width, height, created_by,
         created_at
       ) VALUES ($1, 'k/1', 'image/png', 10, 10, 10, 'a', now())`,
      [ASSET],
    );
  });

  afterAll(async () => {
    await client.end();
    await (await database).drop();
  });

  it("accepts a valid project and a valid image pair", async () => {
    await expect(
      client.query(INSERT_PROJECT, project({ position: 0 })),
    ).resolves.toBeDefined();
    await expect(
      client.query(
        INSERT_PROJECT,
        project({ position: 1, assetId: ASSET, alt: "Una taza" }),
      ),
    ).resolves.toBeDefined();
  });

  it("rejects a blank or over-long name", async () => {
    await expect(
      client.query(INSERT_PROJECT, project({ position: 10, name: "   " })),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "intensive_project_name_check",
    });
    await expect(
      client.query(
        INSERT_PROJECT,
        project({ position: 11, name: "x".repeat(81) }),
      ),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "intensive_project_name_check",
    });
  });

  it("rejects a price that is zero or not in whole pesos", async () => {
    // A zero price also leaves no valid deposit, which Postgres reports first.
    await expect(
      client.query(
        INSERT_PROJECT,
        project({ position: 12, price: 0, deposit: 100 }),
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      client.query(
        INSERT_PROJECT,
        project({ position: 12, price: 3000050, deposit: 100 }),
      ),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "intensive_project_price_check",
    });
  });

  it("rejects a deposit that is zero, above the price or not in whole pesos", async () => {
    for (const deposit of [0, 3000100, 1000050]) {
      await expect(
        client.query(INSERT_PROJECT, project({ position: 13, deposit })),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "intensive_project_deposit_check",
      });
    }
  });

  it("keeps the image and its alt text together", async () => {
    await expect(
      client.query(
        INSERT_PROJECT,
        project({ position: 14, assetId: ASSET, alt: null }),
      ),
    ).rejects.toMatchObject({ constraint: "intensive_project_image_check" });
    await expect(
      client.query(
        INSERT_PROJECT,
        project({ position: 15, assetId: null, alt: "Huérfano" }),
      ),
    ).rejects.toMatchObject({ constraint: "intensive_project_image_check" });
    await expect(
      client.query(
        INSERT_PROJECT,
        project({ position: 16, assetId: ASSET, alt: "   " }),
      ),
    ).rejects.toMatchObject({ constraint: "intensive_project_image_check" });
  });

  it("refuses a repeated position, a negative position and an unknown image", async () => {
    await expect(
      client.query(INSERT_PROJECT, project({ position: 0 })),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "intensive_project_position_unique",
    });
    await expect(
      client.query(INSERT_PROJECT, project({ position: -1 })),
    ).rejects.toMatchObject({ constraint: "intensive_project_position_check" });
    await expect(
      client.query(
        INSERT_PROJECT,
        project({
          position: 17,
          assetId: "00000000-0000-4000-8000-0000000000ff",
          alt: "x",
        }),
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("guards the bill of materials: quantity 1 to 20, one row per position, no variant foreign key", async () => {
    const owner = nextId();
    await client.query(INSERT_PROJECT, project({ id: owner, position: 30 }));
    const insert = (position: number, quantity: number) =>
      client.query(
        `INSERT INTO intensive_project_material
           (project_id, position, variant_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [owner, position, VARIANT, quantity],
      );
    for (const quantity of [0, 21]) {
      await expect(insert(0, quantity)).rejects.toMatchObject({
        constraint: "intensive_project_material_quantity_check",
      });
    }
    await expect(insert(-1, 1)).rejects.toMatchObject({
      constraint: "intensive_project_material_position_check",
    });
    // The variant is not in material_variant: saving a material deletes and
    // re-inserts its variants, so the bill keeps no foreign key to them.
    await expect(insert(0, 2)).resolves.toBeDefined();
    await expect(insert(0, 1)).rejects.toMatchObject({ code: "23505" });
    await client.query("DELETE FROM intensive_project WHERE id = $1", [owner]);
    const { rows } = await client.query(
      "SELECT 1 FROM intensive_project_material WHERE project_id = $1",
      [owner],
    );
    expect(rows).toHaveLength(0);
  });

  it("lets a request hold no project yet and snapshots price and deposit together", async () => {
    await expect(
      client.query(
        INSERT_REQUEST,
        request({ status: "pending_confirmation", price: null, deposit: null }),
      ),
    ).resolves.toBeDefined();
    for (const [price, deposit] of [
      [3000000, null],
      [null, 1000000],
      [1000000, 3000000],
      [3000050, 1000000],
      [3000000, 1000050],
    ] as const)
      await expect(
        client.query(
          INSERT_REQUEST,
          request({ status: "pending_confirmation", price, deposit }),
        ),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "intensive_seat_request_snapshot_check",
      });
  });

  it("accepts one full balance payment on a confirmed request", async () => {
    await expect(
      client.query(
        INSERT_REQUEST,
        request({
          balance: 2000000,
          balancePaidOn: "2026-12-01",
          balanceBy: "admin@example.com",
          balanceAt: new Date("2026-12-01T15:00:00.000Z"),
        }),
      ),
    ).resolves.toBeDefined();
  });

  it("rejects a balance that is not price minus deposit", async () => {
    await expect(
      client.query(
        INSERT_REQUEST,
        request({
          balance: 1500000,
          balancePaidOn: "2026-12-01",
          balanceBy: "admin@example.com",
          balanceAt: new Date(),
        }),
      ),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "intensive_seat_request_balance_amount_check",
    });
    await expect(
      client.query(
        INSERT_REQUEST,
        request({
          price: null,
          deposit: null,
          balance: 2000000,
          balancePaidOn: "2026-12-01",
          balanceBy: "admin@example.com",
          balanceAt: new Date(),
        }),
      ),
    ).rejects.toMatchObject({
      constraint: "intensive_seat_request_balance_amount_check",
    });
  });

  it("rejects a balance unless the request is confirmed", async () => {
    for (const status of ["pending_confirmation", "cancelled"])
      await expect(
        client.query(
          INSERT_REQUEST,
          request({
            status,
            balance: 2000000,
            balancePaidOn: "2026-12-01",
            balanceBy: "admin@example.com",
            balanceAt: new Date(),
          }),
        ),
      ).rejects.toMatchObject({
        code: "23514",
        constraint: "intensive_seat_request_balance_status_check",
      });
  });

  it("takes the balance fields all or nothing", async () => {
    await expect(
      client.query(
        INSERT_REQUEST,
        request({ balance: 2000000, balancePaidOn: "2026-12-01" }),
      ),
    ).rejects.toMatchObject({
      code: "23514",
      constraint: "intensive_seat_request_balance_complete_check",
    });
    await expect(
      client.query(INSERT_REQUEST, request({ balanceBy: "admin@example.com" })),
    ).rejects.toMatchObject({
      constraint: "intensive_seat_request_balance_complete_check",
    });
  });

  it("guards the allocated materials of a request and removes them with it", async () => {
    const requestId = nextId();
    await client.query(INSERT_REQUEST, request({ id: requestId }));
    const insert = (
      position: number,
      overrides: { source?: string; quantity?: number; cost?: number | null },
    ) =>
      client.query(
        `INSERT INTO intensive_request_material (
           request_id, position, variant_id, material_name, variant_label,
           supplier_id, supplier_name, quantity, unit_cost_centavos, source,
           requested_at
         ) VALUES ($1, $2, $3, 'Arcilla', 'Blanca', $4, 'Proveedor', $5, $6, $7, NULL)`,
        [
          requestId,
          position,
          VARIANT,
          SUPPLIER,
          overrides.quantity ?? 2,
          overrides.cost === undefined ? 150000 : overrides.cost,
          overrides.source ?? "stock",
        ],
      );
    await expect(insert(0, { source: "gift" })).rejects.toMatchObject({
      constraint: "intensive_request_material_source_check",
    });
    await expect(insert(0, { quantity: 0 })).rejects.toMatchObject({
      constraint: "intensive_request_material_quantity_check",
    });
    await expect(insert(0, { cost: 0 })).rejects.toMatchObject({
      constraint: "intensive_request_material_unit_cost_check",
    });
    await expect(insert(-1, {})).rejects.toMatchObject({
      constraint: "intensive_request_material_position_check",
    });
    await expect(insert(0, { cost: null })).resolves.toBeDefined();
    await expect(insert(0, {})).rejects.toMatchObject({ code: "23505" });
    await client.query("DELETE FROM intensive_seat_request WHERE id = $1", [
      requestId,
    ]);
    const { rows } = await client.query(
      "SELECT 1 FROM intensive_request_material WHERE request_id = $1",
      [requestId],
    );
    expect(rows).toHaveLength(0);
  });

  it("removes the projects of a deleted intensivo", async () => {
    const other = "00000000-0000-4000-8000-0000000000a2";
    await client.query(
      `INSERT INTO intensive_workshop (
         id, slug, name, summary, description, event_date, starts_at, ends_at,
         price_centavos, deposit_centavos, capacity, min_seats, policy_text,
         materials_included, status, updated_by, updated_at
       ) VALUES (
         $1, 'taller-dos', 'Taller dos', 's', 'd', '2026-12-06', '10:00',
         '14:00', 3000000, 1000000, 8, 1, 'p', true, 'draft',
         'admin@example.com', now()
       )`,
      [other],
    );
    await client.query(INSERT_PROJECT, [
      nextId(),
      other,
      0,
      "Del otro",
      null,
      null,
      3000000,
      1000000,
    ]);
    await client.query("DELETE FROM intensive_workshop WHERE id = $1", [other]);
    const { rows } = await client.query(
      "SELECT 1 FROM intensive_project WHERE intensive_id = $1",
      [other],
    );
    expect(rows).toHaveLength(0);
  });
});
