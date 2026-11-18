import type pg from "pg";

/**
 * A deterministic, staging-shaped dataset written with plain SQL against the
 * 0017 schema (the last migration before 0018). Rows are plain snake_case
 * records so they mirror the table columns; nothing here uses application
 * code, so the migration is rehearsed over exactly what an old deploy wrote.
 */
type Row = Record<string, unknown>;

export interface LegacyOrder {
  id: string;
  number: string;
  status: string;
  /** The email exactly as the legacy row stores it (may be padded or mixed case). */
  email: string;
  name: string;
  phone: string;
  period: string;
  workshopIndex: number;
  requestedAt: Date;
  row: Row;
  lines: Row[];
  audit: Row[];
}

export interface LegacyIntensive {
  id: string;
  name: string;
  priceCentavos: number;
  depositCentavos: number;
  updatedAt: Date;
}

export interface LegacySeatRequest {
  id: string;
  intensiveId: string;
  status: string;
  email: string;
  createdAt: Date;
}

export interface LegacyDataset {
  rowsByTable: Map<string, Row[]>;
  orders: LegacyOrder[];
  intensives: LegacyIntensive[];
  seatRequests: LegacySeatRequest[];
  privateEvents: { id: string; createdAt: Date }[];
}

const MONTHS = ["2026-08", "2026-09", "2026-10"] as const;
const DAYS = [
  "",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const FIRST = [
  "Ana",
  "Bea",
  "Cleo",
  "Dora",
  "Eva",
  "Flor",
  "Gala",
  "Hilda",
  "Irma",
  "Julia",
  "Karen",
  "Lara",
];
const LAST = [
  "Perez",
  "Gomez",
  "Diaz",
  "Ruiz",
  "Soto",
  "Vega",
  "Luna",
  "Rios",
  "Paz",
  "Mora",
  "Ledesma",
];
const TEACHERS = [
  { name: "Marta Quiroga", modality: "own" },
  { name: "Lucía Ferrero", modality: "own" },
  { name: "Paula Ibarra", modality: "third_party" },
  { name: "Inés Duarte", modality: "third_party" },
] as const;
const WORKSHOPS = [
  {
    slug: "ceramica-inicial",
    name: "Cerámica inicial",
    fee: 5800000,
    teacher: 0,
  },
  { slug: "tejido-telar", name: "Tejido en telar", fee: 6200000, teacher: 1 },
  {
    slug: "encordado-libre",
    name: "Encordado libre",
    fee: 6500000,
    teacher: 2,
  },
  {
    slug: "dibujo-botanico",
    name: "Dibujo botánico",
    fee: 5400000,
    teacher: 3,
  },
  { slug: "joyeria-basica", name: "Joyería básica", fee: 7000000, teacher: 2 },
] as const;
const SUPPLIERS = [
  "Mercería Central",
  "Lanas del Sur",
  "Arte y Barro",
] as const;
const STATUS_CYCLE = [
  "paid",
  "pending_confirmation",
  "paid",
  "materials_requested",
  "materials_received",
  "cancelled",
  "paid",
  "pending_confirmation",
] as const;
const PAID_STATES = new Set([
  "paid",
  "materials_requested",
  "materials_received",
]);
const STUDENT_COUNT = 36;

/** Deterministic uuid: a kind and a number, always 36 characters. */
function uid(kind: number, n: number): string {
  const tail = `${kind.toString(16).padStart(2, "0")}${n.toString(16).padStart(10, "0")}`;
  return `00000000-0000-4000-8000-${tail}`;
}

const K = {
  teacher: 1,
  supplier: 2,
  material: 3,
  variant: 4,
  workshop: 5,
  turno: 6,
  period: 7,
  order: 8,
  intensive: 9,
  seat: 10,
  event: 11,
  audit: 12,
  makeUp: 13,
};

const teacherId = (i: number): string => uid(K.teacher, i);
const supplierId = (i: number): string => uid(K.supplier, i);
const materialId = (i: number): string => uid(K.material, i);
const variantId = (material: number, v: number): string =>
  uid(K.variant, material * 3 + v);
const workshopId = (i: number): string => uid(K.workshop, i);
const turnoId = (w: number, j: number): string => uid(K.turno, w * 2 + j);
const periodId = (w: number, m: number): string => uid(K.period, w * 3 + m);

/** Array access that fails loudly, wrapping around the end. */
function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) throw new Error("pick on an empty list");
  return item;
}

function turnoOf(w: number, j: number) {
  const weekday = ((w + 2 * j) % 5) + 1;
  const start = j === 0 ? "10:00" : "18:00";
  const end = j === 0 ? "12:00" : "20:00";
  return {
    weekday,
    start,
    end,
    label: `${pick(DAYS, weekday)} ${start} a ${end}`,
  };
}

const UPDATED = new Date("2026-07-01T12:00:00Z");

function variantPrice(material: number, v: number): number | null {
  // One variant is "price on request" (0017): no price, so it never has a line.
  return material === 4 && v === 1 ? null : 150000 + 50000 * (material * 3 + v);
}

function studentEmail(s: number): string {
  return `alumna${String(s).padStart(2, "0")}@example.com`;
}
function studentPhone(s: number): string {
  return `549351${String(500000 + s)}`;
}

interface OrderSpec {
  n: number;
  email: string;
  name: string;
  phone: string;
  workshop: number;
  turno: number;
  month: number;
  status: string;
  requestedAt: Date;
  lines?: [number, number, number][] | undefined;
}

function makeOrder(spec: OrderSpec): LegacyOrder {
  const { n, workshop, turno, month, status } = spec;
  const id = uid(K.order, n);
  const number = `CI-2026-${String(n).padStart(4, "0")}`;
  const period = pick(MONTHS, month);
  const t = turnoOf(workshop, turno);
  const fee = pick(WORKSHOPS, workshop).fee;
  const lineRows = (spec.lines ?? []).map(([mat, v, quantity], position) => ({
    order_id: id,
    position,
    material_id: materialId(mat),
    variant_id: variantId(mat, v),
    material_name: `Material ${String(mat)}`,
    variant_label: `Variante ${String(v)}`,
    unit_price_centavos: variantPrice(mat, v) ?? 150000,
    quantity,
    supplier_id: supplierId(mat % 3),
    supplier_name: pick(SUPPLIERS, mat % 3),
  }));
  const materials = lineRows.reduce(
    (sum, line) => sum + line.unit_price_centavos * line.quantity,
    0,
  );
  const total = fee + materials;
  const paidAt = new Date(spec.requestedAt.getTime() + 86_400_000);
  const paidState = PAID_STATES.has(status);
  const cancelledPaid = status === "cancelled" && n % 2 === 0;
  const hasPayment = paidState || cancelledPaid;
  const row: Row = {
    id,
    public_id: `order_${String(n).padStart(18, "0")}`,
    number,
    status,
    source: "public",
    workshop_id: workshopId(workshop),
    period_id: periodId(workshop, month),
    period,
    turno_id: turnoId(workshop, turno),
    workshop_name: pick(WORKSHOPS, workshop).name,
    turno_label: t.label,
    weekday: t.weekday,
    starts_at: t.start,
    ends_at: t.end,
    student_name: spec.name,
    student_email: spec.email,
    student_phone_digits: spec.phone,
    fee_centavos: fee,
    materials_centavos: materials,
    total_centavos: total,
    policy_version: period,
    requested_at: spec.requestedAt,
    paid_at: hasPayment ? paidAt : null,
    paid_amount_centavos: hasPayment ? total : null,
    payment_note: hasPayment ? "Transferencia" : null,
    confirmed_by: hasPayment ? "owner" : null,
    cancelled_at:
      status === "cancelled" ? new Date(paidAt.getTime() + 86_400_000) : null,
    cancel_reason: status === "cancelled" ? "No puede asistir" : null,
    cancelled_by: status === "cancelled" ? "owner" : null,
  };
  const audit: Row[] = [
    {
      id: uid(K.audit, n * 4),
      order_id: id,
      at: spec.requestedAt,
      actor: "public",
      from: null,
      to: "pending_confirmation",
      note: null,
    },
  ];
  if (status !== "pending_confirmation") {
    audit.push({
      id: uid(K.audit, n * 4 + 1),
      order_id: id,
      at: paidAt,
      actor: "owner",
      from: "pending_confirmation",
      to: status === "cancelled" ? "cancelled" : "paid",
      note: null,
    });
  }
  return {
    id,
    number,
    status,
    email: spec.email,
    name: spec.name,
    phone: spec.phone,
    period,
    workshopIndex: workshop,
    requestedAt: spec.requestedAt,
    row,
    lines: lineRows,
    audit,
  };
}

function at(month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, 7 + month, day, hour, minute));
}

function buildOrders(): LegacyOrder[] {
  const orders: LegacyOrder[] = [];
  let n = 0;
  let k = 0;
  // The regular pool: one order per student and month, a different workshop
  // most months, every legacy status, material lines on a third of them.
  for (let month = 0; month < MONTHS.length; month += 1) {
    for (let s = 0; s < STUDENT_COUNT; s += 1) {
      if ((s * 7 + month * 3) % 5 === 0) continue;
      n += 1;
      const base = `${pick(FIRST, s)} ${pick(LAST, s * 5)}`;
      // Spelling drifts across months for a quarter of the students.
      const name =
        s % 4 === 0
          ? pick([base.toUpperCase(), base, `${base} Ruiz`], month)
          : base;
      // A fifth of the students change phone in the last month.
      const phone =
        s % 5 === 0 && month < 2
          ? `549351${String(400000 + s)}`
          : studentPhone(s);
      const lines: [number, number, number][] | undefined =
        k % 3 === 0
          ? [
              [k % 6, (k + 1) % 3, 1 + (k % 3)],
              [(k + 2) % 6, k % 3, 1],
            ]
          : undefined;
      const safeLines = lines?.filter(
        ([mat, v]) => variantPrice(mat, v) !== null,
      );
      orders.push(
        makeOrder({
          n,
          email: studentEmail(s),
          name,
          phone,
          workshop: (s + 2 * month) % WORKSHOPS.length,
          turno: (s + month) % 2,
          month,
          status: pick(STATUS_CYCLE, k),
          requestedAt: at(month, 1 + (s % 25), 9 + (s % 8), s % 60),
          lines: safeLines,
        }),
      );
      k += 1;
    }
  }

  // Case (a), L13: a cancelled order followed by a new one in the same month.
  const julia = "julia.roa@example.com";
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: julia,
      name: "Julia Roa",
      phone: "549351700001",
      workshop: 0,
      turno: 0,
      month: 1,
      status: "cancelled",
      requestedAt: at(1, 3, 10, 0),
    }),
  );
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: julia,
      name: "Julia Roa",
      phone: "549351700001",
      workshop: 0,
      turno: 1,
      month: 1,
      status: "paid",
      requestedAt: at(1, 4, 10, 0),
    }),
  );
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: julia,
      name: "Julia Roa",
      phone: "549351700001",
      workshop: 0,
      turno: 0,
      month: 2,
      status: "cancelled",
      requestedAt: at(2, 2, 10, 0),
      lines: [[0, 0, 2]],
    }),
  );
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: julia,
      name: "Julia Roa Díaz",
      phone: "549351700002",
      workshop: 1,
      turno: 1,
      month: 2,
      status: "pending_confirmation",
      requestedAt: at(2, 9, 10, 0),
    }),
  );

  // Padded, mixed-case email and a padded name on the latest order.
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: "  Marta.Sosa@Example.com ",
      name: "Marta Sosa",
      phone: "549351700010",
      workshop: 2,
      turno: 0,
      month: 0,
      status: "paid",
      requestedAt: at(0, 5, 11, 0),
    }),
  );
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: "MARTA.SOSA@example.com",
      name: "  Marta  Sosa Vera ",
      phone: "549351700010",
      workshop: 3,
      turno: 1,
      month: 2,
      status: "materials_requested",
      requestedAt: at(2, 6, 11, 0),
      lines: [[1, 2, 1]],
    }),
  );

  // A phone change, and a different student whose latest phone is the old one.
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: "nora.vidal@example.com",
      name: "Nora Vidal",
      phone: "549351600001",
      workshop: 4,
      turno: 0,
      month: 0,
      status: "paid",
      requestedAt: at(0, 7, 15, 0),
    }),
  );
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: "nora.vidal@example.com",
      name: "Nora Vidal",
      phone: "549351600002",
      workshop: 4,
      turno: 1,
      month: 2,
      status: "paid",
      requestedAt: at(2, 7, 15, 0),
    }),
  );
  n += 1;
  orders.push(
    makeOrder({
      n,
      email: "olga.ponce@example.com",
      name: "Olga Ponce",
      phone: "549351600001",
      workshop: 1,
      turno: 0,
      month: 2,
      status: "pending_confirmation",
      requestedAt: at(2, 8, 15, 0),
    }),
  );
  return orders;
}

function buildIntensives(): {
  workshops: LegacyIntensive[];
  rows: Row[];
  requests: LegacySeatRequest[];
  requestRows: Row[];
} {
  const names = [
    "Taller de velas",
    "Intensivo de cestería",
    "  Intensivo de bordado   ",
    // 95 characters: 0018 keeps the first 80 for the project name.
    `Intensivo de macramé con técnicas combinadas, nudos y trenzas para piezas grandes ${"x".repeat(14)}`,
    "Intensivo de acuarela",
    "Intensivo de fieltro",
  ];
  const statuses = [
    "published",
    "published",
    "published",
    "paused",
    "cancelled",
    "archived",
  ];
  const workshops: LegacyIntensive[] = [];
  const rows: Row[] = [];
  names.forEach((name, i) => {
    const price = 3500000 + i * 500000;
    workshops.push({
      id: uid(K.intensive, i),
      name,
      priceCentavos: price,
      depositCentavos: 1000000,
      updatedAt: new Date(UPDATED.getTime() + i * 3_600_000),
    });
    rows.push({
      id: uid(K.intensive, i),
      slug: `intensivo-${String(i)}`,
      name,
      summary: "Resumen",
      description: "Descripción larga",
      teacher_id: i % 2 === 0 ? teacherId(i % TEACHERS.length) : null,
      agreed_percentage_bp: i % 2 === 0 && i % 4 === 2 ? 6000 : null,
      event_date: `2026-11-${String(10 + i).padStart(2, "0")}`,
      starts_at: "10:00",
      ends_at: "14:00",
      price_centavos: price,
      deposit_centavos: 1000000,
      capacity: 10,
      min_seats: 3,
      policy_text: "Seña no reembolsable",
      materials_included: i % 2 === 0,
      status: pick(statuses, i),
      updated_by: "owner",
      updated_at: new Date(UPDATED.getTime() + i * 3_600_000),
    });
  });

  const requests: LegacySeatRequest[] = [];
  const requestRows: Row[] = [];
  const cycle = [
    "pending_confirmation",
    "confirmed",
    "cancelled",
    "pending_confirmation",
    "confirmed",
  ];
  let n = 0;
  const addRequest = (
    intensive: number,
    email: string,
    status: string,
    paid: boolean,
    createdAt: Date,
  ): void => {
    n += 1;
    const id = uid(K.seat, n);
    requests.push({
      id,
      intensiveId: uid(K.intensive, intensive),
      status,
      email,
      createdAt,
    });
    const hasPayment =
      status === "confirmed" || (status === "cancelled" && paid);
    requestRows.push({
      id,
      public_id: `request_${String(n).padStart(18, "0")}`,
      intensive_id: uid(K.intensive, intensive),
      status,
      full_name: `Cursante ${String(n)}`,
      email,
      phone_digits: `549351${String(800000 + n)}`,
      policy_accepted_at: createdAt,
      created_at: createdAt,
      paid_centavos: hasPayment ? 1000000 : null,
      paid_on: hasPayment ? "2026-10-20" : null,
      payment_note: hasPayment ? "Efectivo" : null,
      confirmed_by: status === "confirmed" ? "owner" : null,
      confirmed_at:
        status === "confirmed"
          ? new Date(createdAt.getTime() + 86_400_000)
          : null,
      cancel_reason: status === "cancelled" ? "Cambio de planes" : null,
      cancelled_by: status === "cancelled" ? "owner" : null,
      cancelled_at:
        status === "cancelled"
          ? new Date(createdAt.getTime() + 172_800_000)
          : null,
    });
  };
  for (let i = 0; i < names.length; i += 1) {
    for (let j = 0; j < cycle.length; j += 1) {
      // Some seat requesters are also monthly students.
      const email =
        j % 2 === 0
          ? studentEmail(i * 5 + j)
          : `cursante.${String(i)}.${String(j)}@example.com`;
      addRequest(
        i,
        email,
        pick(cycle, j),
        i % 2 === 0,
        new Date(Date.UTC(2026, 9, 1 + j + i, 10, i)),
      );
    }
  }
  // A cancelled request followed by a live one for the same email.
  addRequest(
    0,
    "repite@example.com",
    "cancelled",
    false,
    new Date("2026-10-02T09:00:00Z"),
  );
  addRequest(
    0,
    "repite@example.com",
    "pending_confirmation",
    false,
    new Date("2026-10-09T09:00:00Z"),
  );
  return { workshops, rows, requests, requestRows };
}

export function buildLegacyDataset(): LegacyDataset {
  const rowsByTable = new Map<string, Row[]>();
  const add = (table: string, ...rows: Row[]): void => {
    rowsByTable.set(table, [...(rowsByTable.get(table) ?? []), ...rows]);
  };

  TEACHERS.forEach((t, i) => {
    add("teacher", {
      id: teacherId(i),
      name: t.name,
      name_key: t.name.toLowerCase(),
      bio_line: `Profe de ${pick(WORKSHOPS, i).name}`,
      phone: `35155500${String(i)}`,
      email: null,
      modality: t.modality,
      active: true,
      updated_by: "owner",
      updated_at: UPDATED,
    });
  });
  SUPPLIERS.forEach((name, i) => {
    add("supplier", {
      id: supplierId(i),
      name,
      name_key: name.toLowerCase(),
      phone: null,
      email: null,
      notes: null,
      active: true,
      updated_by: "owner",
      updated_at: UPDATED,
    });
  });
  for (let m = 0; m < 6; m += 1) {
    add("material", {
      id: materialId(m),
      name: `Material ${String(m)}`,
      name_key: `material ${String(m)}`,
      description: "Descripción",
      category: m < 3 ? "Hilos" : "Barros",
      category_key: m < 3 ? "hilos" : "barros",
      supplier_id: supplierId(m % 3),
      available: true,
      active: true,
      image_asset_id: null,
      image_alt: null,
      updated_by: "owner",
      updated_at: UPDATED,
    });
    for (let v = 0; v < 3; v += 1) {
      add("material_variant", {
        id: variantId(m, v),
        material_id: materialId(m),
        label: `Variante ${String(v)}`,
        label_key: `variante ${String(v)}`,
        price_centavos: variantPrice(m, v),
        available: v !== 2,
        position: v,
        swatch: v === 0 ? "#aa8866" : null,
      });
    }
  }

  WORKSHOPS.forEach((w, i) => {
    const teacher = pick(TEACHERS, w.teacher);
    const percentage = teacher.modality === "third_party" ? 7000 : null;
    add("monthly_workshop", {
      id: workshopId(i),
      slug: w.slug,
      name: w.name,
      summary: "Resumen del taller",
      description: "Contenido del taller",
      technique: w.name,
      default_fee_centavos: w.fee,
      teacher_id: teacherId(w.teacher),
      agreed_percentage_bp: percentage,
      status: "published",
      updated_by: "owner",
      updated_at: UPDATED,
    });
    for (let j = 0; j < 2; j += 1) {
      const t = turnoOf(i, j);
      add("workshop_turno", {
        id: turnoId(i, j),
        workshop_id: workshopId(i),
        label: t.label,
        label_key: t.label.toLowerCase(),
        weekday: t.weekday,
        starts_at: t.start,
        ends_at: t.end,
        default_capacity: 12,
        active: true,
      });
    }
    MONTHS.forEach((period, m) => {
      add("workshop_period", {
        id: periodId(i, m),
        workshop_id: workshopId(i),
        period,
        fee_centavos: w.fee,
        materials_required: i % 2 === 0,
        project_title: null,
        project_description: null,
        snapshot_teacher_id: teacherId(w.teacher),
        snapshot_teacher_name: teacher.name,
        snapshot_teacher_modality: teacher.modality,
        snapshot_percentage_bp: percentage,
        status: m === 2 ? "open" : "closed",
        opened_by: "owner",
        opened_at: UPDATED,
        updated_by: "owner",
        updated_at: UPDATED,
      });
      // Dormant after 0018: the offered-material list of a period.
      if (i % 2 === 0) {
        add(
          "period_material_offer",
          {
            period_id: periodId(i, m),
            material_id: materialId(i),
            position: 0,
          },
          {
            period_id: periodId(i, m),
            material_id: materialId(i + 1),
            position: 1,
          },
        );
      }
    });
  });

  const orders = buildOrders();
  for (const order of orders) {
    add("enrollment_order", order.row);
    add("order_line", ...order.lines);
    add("order_audit", ...order.audit);
  }
  const confirmedByTurno = new Map<string, number>();
  for (const order of orders) {
    if (!PAID_STATES.has(order.status)) continue;
    const key = `${order.row.period_id as string}|${order.row.turno_id as string}`;
    confirmedByTurno.set(key, (confirmedByTurno.get(key) ?? 0) + 1);
  }
  for (let w = 0; w < WORKSHOPS.length; w += 1) {
    for (let m = 0; m < MONTHS.length; m += 1) {
      for (let j = 0; j < 2; j += 1) {
        add("period_turno", {
          period_id: periodId(w, m),
          turno_id: turnoId(w, j),
          workshop_id: workshopId(w),
          capacity: 12,
        });
        add("turno_seat_counter", {
          period_id: periodId(w, m),
          turno_id: turnoId(w, j),
          confirmed_seats:
            confirmedByTurno.get(`${periodId(w, m)}|${turnoId(w, j)}`) ?? 0,
          capacity: 12,
        });
      }
    }
  }
  add("order_number_sequence", { year: 2026, last: orders.length });

  const intensive = buildIntensives();
  for (const row of intensive.rows) add("intensive_workshop", row);
  for (const row of intensive.requestRows) {
    add("intensive_seat_request", row);
  }

  const events: { id: string; createdAt: Date }[] = [];
  const eventStatus = ["nueva", "contactada", "cerrada"];
  for (let i = 0; i < 8; i += 1) {
    const createdAt = new Date(Date.UTC(2026, 8, 5 + i * 4, 14, i));
    events.push({ id: uid(K.event, i), createdAt });
    add("private_event_request", {
      id: uid(K.event, i),
      status: pick(eventStatus, i % 3),
      full_name: `Contacto ${String(i)}`,
      phone_digits: `549351${String(900000 + i)}`,
      email: i % 2 === 0 ? `evento${String(i)}@example.com` : null,
      desired_date: `2026-12-${String(5 + i).padStart(2, "0")}`,
      place: i % 2 === 0 ? "Casa" : "Salón",
      participants: 6 + i,
      notes: i === 3 ? "Cumpleaños" : null,
      created_at: createdAt,
      status_changed_by: i % 3 === 0 ? null : "owner",
      status_changed_at: i % 3 === 0 ? null : createdAt,
    });
  }

  // Attendance, make-ups and notes are keyed by email and untouched by 0018,
  // except that it rewrites the make-up CHECKs, which must accept these rows.
  for (let i = 0; i < 6; i += 1) {
    add("attendance_mark", {
      period_id: periodId(0, 1),
      turno_id: turnoId(0, 0),
      session_date: new Date(Date.UTC(2026, 8, 7 + i * 7))
        .toISOString()
        .slice(0, 10),
      student_email: studentEmail(i),
      status: i % 2 === 0 ? "present" : "absent",
      marked_by: "owner",
      marked_at: at(1, 8 + i, 12, 0),
    });
  }
  add(
    "attendance_make_up",
    {
      id: uid(K.makeUp, 1),
      student_email: studentEmail(1),
      student_name: "Bea Gomez",
      period_id: periodId(0, 1),
      turno_id: turnoId(0, 0),
      session_date: "2026-09-14",
      make_up_period_id: periodId(0, 1),
      make_up_turno_id: turnoId(0, 1),
      make_up_date: "2026-09-21",
      status: "pending",
      created_by: "owner",
      created_at: at(1, 15, 9, 0),
      done_by: null,
      done_at: null,
    },
    {
      id: uid(K.makeUp, 2),
      student_email: studentEmail(3),
      student_name: "Dora Ruiz",
      period_id: periodId(0, 1),
      turno_id: turnoId(0, 0),
      session_date: "2026-09-28",
      make_up_period_id: periodId(0, 1),
      make_up_turno_id: turnoId(0, 1),
      make_up_date: "2026-10-05",
      status: "done",
      created_by: "owner",
      created_at: at(1, 29, 9, 0),
      done_by: "owner",
      done_at: at(2, 5, 20, 0),
    },
  );
  for (let i = 0; i < 3; i += 1) {
    add("student_note", {
      email: studentEmail(i),
      note: `Nota ${String(i)}`,
      updated_by: "owner",
      updated_at: UPDATED,
    });
  }

  return {
    rowsByTable,
    orders,
    intensives: intensive.workshops,
    seatRequests: intensive.requests,
    privateEvents: events,
  };
}

/** Insert order: parents before children, no foreign keys point backwards. */
const INSERT_ORDER = [
  "teacher",
  "supplier",
  "material",
  "material_variant",
  "monthly_workshop",
  "workshop_turno",
  "workshop_period",
  "period_turno",
  "period_material_offer",
  "turno_seat_counter",
  "enrollment_order",
  "order_line",
  "order_audit",
  "order_number_sequence",
  "intensive_workshop",
  "intensive_seat_request",
  "private_event_request",
  "attendance_mark",
  "attendance_make_up",
  "student_note",
];

export async function insertRows(
  client: pg.Client,
  table: string,
  rows: Row[],
): Promise<void> {
  for (const row of rows) {
    const columns = Object.keys(row);
    const names = columns.map((column) => `"${column}"`).join(", ");
    const params = columns.map((_, i) => `$${String(i + 1)}`).join(", ");
    await client.query(
      `INSERT INTO "${table}" (${names}) VALUES (${params})`,
      columns.map((column) => row[column]),
    );
  }
}

export async function insertLegacyDataset(
  client: pg.Client,
  dataset: LegacyDataset,
): Promise<void> {
  const unknown = [...dataset.rowsByTable.keys()].filter(
    (table) => !INSERT_ORDER.includes(table),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Dataset tables with no insert order: ${unknown.join(", ")}`,
    );
  }
  for (const table of INSERT_ORDER) {
    await insertRows(client, table, dataset.rowsByTable.get(table) ?? []);
  }
}

/** Writes extra legacy orders (with their lines and audit) on top of a dataset. */
export async function insertLegacyOrders(
  client: pg.Client,
  orders: LegacyOrder[],
): Promise<void> {
  for (const order of orders) {
    await insertRows(client, "enrollment_order", [order.row]);
    await insertRows(client, "order_line", order.lines);
    await insertRows(client, "order_audit", order.audit);
  }
}

/**
 * The two L13 cases that 0018 must refuse. Order numbers start above the
 * dataset's so they stay unique.
 */
export function buildCollidingOrders(
  kind: "same-email-two-workshops" | "shared-latest-phone",
  dataset: LegacyDataset,
): LegacyOrder[] {
  const first = dataset.orders.length + 1;
  if (kind === "same-email-two-workshops") {
    return [
      makeOrder({
        n: first,
        email: "doble@example.com",
        name: "Doble Inscripta",
        phone: "549351750001",
        workshop: 0,
        turno: 0,
        month: 2,
        status: "pending_confirmation",
        requestedAt: at(2, 11, 10, 0),
      }),
      makeOrder({
        n: first + 1,
        email: "doble@example.com",
        name: "Doble Inscripta",
        phone: "549351750001",
        workshop: 1,
        turno: 0,
        month: 2,
        status: "paid",
        requestedAt: at(2, 12, 10, 0),
      }),
    ];
  }
  return [
    makeOrder({
      n: first,
      email: "uno@example.com",
      name: "Uno Compartida",
      phone: "549351750002",
      workshop: 2,
      turno: 1,
      month: 2,
      status: "pending_confirmation",
      requestedAt: at(2, 13, 10, 0),
    }),
    makeOrder({
      n: first + 1,
      email: "dos@example.com",
      name: "Dos Compartida",
      phone: "549351750002",
      workshop: 3,
      turno: 0,
      month: 2,
      status: "paid",
      requestedAt: at(2, 14, 10, 0),
    }),
  ];
}
