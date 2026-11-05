import { describe, expect, it } from "vitest";
import type { IssueCode } from "~/modules/_shared";
import { findCopyViolations } from "~/modules/site-content";
import {
  INTENSIVE_FIELD_MESSAGES,
  intensivePublishRulesMessage,
  intensiveDeleteRuleMessage,
  ISSUE_MESSAGES,
  TURNO_FIELD_MESSAGES,
  WORKSHOP_FIELD_MESSAGES,
  fieldErrors,
  issueMessage,
  publishRulesMessage,
  transitionRefusedMessage,
  turnoRulesMessage,
  workshopRuleMessage,
} from "./issue-messages";

const ALL_CODES: readonly IssueCode[] = [
  "required",
  "too-long",
  "invalid-format",
  "out-of-range",
  "too-many-decimals",
  "not-whole-pesos",
  "duplicate",
  "not-selectable",
  "unknown-reference",
  "too-many",
  "confirmation-required",
  "in-past",
  "end-before-start",
  "exceeds-price",
  "exceeds-capacity",
  "percentage-not-applicable",
];

describe("issueMessage", () => {
  it("has a non-empty Spanish message for every issue code", () => {
    for (const code of ALL_CODES) {
      expect(issueMessage(code).length).toBeGreaterThan(5);
    }
    expect(Object.keys(ISSUE_MESSAGES).sort()).toEqual([...ALL_CODES].sort());
  });

  it("keeps every message in voseo Spanish", () => {
    expect(findCopyViolations(Object.values(ISSUE_MESSAGES))).toEqual([]);
  });

  it("says a required field must be completed", () => {
    expect(issueMessage("required")).toBe("Completá este campo.");
  });

  it("says a duplicate name already exists", () => {
    expect(issueMessage("duplicate")).toBe(
      "Ya existe uno activo con el mismo nombre.",
    );
  });
});

describe("fieldErrors", () => {
  it("maps each field to the message of its first issue", () => {
    expect(
      fieldErrors([
        { field: "name", code: "required" },
        { field: "name", code: "duplicate" },
        { field: "email", code: "invalid-format" },
      ]),
    ).toEqual({
      name: "Completá este campo.",
      email: "El formato no es válido. Revisalo.",
    });
  });

  it("is empty when there are no issues", () => {
    expect(fieldErrors([])).toEqual({});
  });
});

describe("intensive messages", () => {
  it("words intensive slug, time range and gallery issues precisely", () => {
    expect(
      fieldErrors(
        [{ field: "slug", code: "duplicate" }],
        INTENSIVE_FIELD_MESSAGES,
      ),
    ).toEqual({ slug: "Ese enlace ya lo usa otro workshop." });
    expect(
      fieldErrors(
        [{ field: "timeRange", code: "end-before-start" }],
        INTENSIVE_FIELD_MESSAGES,
      ),
    ).toEqual({
      timeRange: "El horario de fin tiene que ser posterior al de inicio.",
    });
    expect(
      fieldErrors(
        [{ field: "images", code: "too-many" }],
        INTENSIVE_FIELD_MESSAGES,
      ),
    ).toEqual({ images: "Podés cargar hasta 6 imágenes." });
  });
});

describe("intensive publish messages", () => {
  it("names every unmet intensive rule in one es-AR form-level message", () => {
    expect(
      intensivePublishRulesMessage([
        "name",
        "slug",
        "teacher",
        "percentage",
        "time-range",
        "future-start",
        "price",
        "deposit",
        "capacity",
        "min-seats",
      ]),
    ).toBe(
      "No se puede guardar este workshop porque falta: un nombre, un enlace válido, un profesor asignado, el porcentaje acordado, un horario válido, una fecha futura, un precio, una seña válida, una capacidad válida, cupos mínimos válidos.",
    );
  });
});

describe("intensive lifecycle messages", () => {
  it("names a draft-only deletion refusal in es-AR", () => {
    expect(intensiveDeleteRuleMessage()).toBe(
      "Solo se puede eliminar un borrador.",
    );
  });
});

describe("workshop messages", () => {
  it("words every publish rule, the refused transition and the delete rule in voseo", () => {
    const rules = [
      "name",
      "slug",
      "teacher",
      "percentage",
      "default-fee",
      "active-turno",
    ] as const;
    for (const rule of rules)
      expect(workshopRuleMessage(rule).length).toBeGreaterThan(5);
    expect(workshopRuleMessage("active-turno")).toBe(
      "al menos un turno activo",
    );
    expect(workshopRuleMessage("draft-without-periods")).toContain("período");
    expect(
      findCopyViolations(
        [...rules, "draft-without-periods" as const].map(workshopRuleMessage),
      ),
    ).toEqual([]);
  });

  it("lists every unmet publish rule in one sentence", () => {
    expect(publishRulesMessage(["teacher", "active-turno"])).toBe(
      "Para publicar falta: un profesor asignado, al menos un turno activo.",
    );
  });

  it("words a refused transition with Spanish state names", () => {
    expect(transitionRefusedMessage("draft", "paused")).toBe(
      "No se puede pasar de Borrador a Pausado.",
    );
  });

  it("uses a slug-specific text for the codes that name a name or a choice", () => {
    expect(
      fieldErrors(
        [
          { field: "slug", code: "duplicate" },
          { field: "name", code: "duplicate" },
        ],
        WORKSHOP_FIELD_MESSAGES,
      ),
    ).toEqual({
      slug: "Ese enlace ya lo usa otro taller.",
      name: "Ya existe uno activo con el mismo nombre.",
    });
    expect(
      fieldErrors(
        [{ field: "slug", code: "confirmation-required" }],
        WORKSHOP_FIELD_MESSAGES,
      ).slug,
    ).toContain("Marcá la confirmación");
    expect(
      findCopyViolations(
        Object.values(WORKSHOP_FIELD_MESSAGES).flatMap((byCode) =>
          Object.values(byCode),
        ),
      ),
    ).toEqual([]);
  });
});

describe("turno messages", () => {
  it("words each turno field issue the service can report", () => {
    expect(
      fieldErrors(
        [
          { field: "label", code: "duplicate" },
          { field: "weekday", code: "out-of-range" },
          { field: "timeRange", code: "invalid-format" },
          { field: "defaultCapacity", code: "out-of-range" },
        ],
        TURNO_FIELD_MESSAGES,
      ),
    ).toEqual({
      label: "Ya hay un turno con ese nombre en este taller.",
      weekday: "Elegí un día de la semana.",
      timeRange:
        "Ingresá los horarios con el formato HH:MM, por ejemplo 10:00.",
      defaultCapacity: "Ingresá un número entero de 1 a 500.",
    });
  });

  it("keeps the end-before-start text for the time range, and the duplicate-free codes generic", () => {
    expect(
      fieldErrors(
        [
          { field: "timeRange", code: "end-before-start" },
          { field: "label", code: "required" },
        ],
        TURNO_FIELD_MESSAGES,
      ),
    ).toEqual({
      timeRange: "El horario de fin tiene que ser posterior al de inicio.",
      label: "Completá este campo.",
    });
  });

  it("explains why a turno cannot be retired or deleted", () => {
    expect(turnoRulesMessage(["last-active-turno-of-published"])).toBe(
      "Es el único turno activo de un taller publicado. Pausá el taller primero.",
    );
    expect(turnoRulesMessage(["turno-used"])).toBe(
      "Algún mes ya usó este turno, así que no se puede eliminar. Retiralo para que no se ofrezca más.",
    );
    expect(
      findCopyViolations([
        ...Object.values(TURNO_FIELD_MESSAGES).flatMap((byCode) =>
          Object.values(byCode),
        ),
        turnoRulesMessage(["turno-used"]),
        turnoRulesMessage(["last-active-turno-of-published"]),
      ]),
    ).toEqual([]);
  });
});
