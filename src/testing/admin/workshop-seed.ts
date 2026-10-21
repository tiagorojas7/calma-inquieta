import { testAdminActor } from "~/testing/fakes/admin-actor";
import type { workshopsFixture } from "./route-kit";

type Fixture = ReturnType<typeof workshopsFixture>;

const DRAFT_FIELDS = {
  name: "Cerámica Creativa",
  slug: "",
  summary: "Modelado y torno",
  description: "Un taller para empezar de cero.",
  technique: "Cerámica",
  defaultFee: "12000",
  teacherId: "",
  percentage: "",
};

/** Form fields of a valid workshop with no teacher yet. */
export const WORKSHOP_FIELDS = { intent: "save", ...DRAFT_FIELDS };

export async function seedTeacher(
  fixture: Fixture,
  fields: { name: string; modality: "own" | "third_party" },
): Promise<string> {
  const created = await fixture.teachers.service.create(testAdminActor(), {
    name: fields.name,
    bioLine: "Presentación",
    phone: "",
    email: "",
    modality: fields.modality,
  });
  if (!created.ok) throw new Error("teacher seed failed");
  return created.value.id;
}

/** Creates a draft workshop through the real service and returns its id. */
export async function seedWorkshop(
  fixture: Fixture,
  overrides: Partial<typeof DRAFT_FIELDS> = {},
): Promise<string> {
  const created = await fixture.service.create(testAdminActor(), {
    ...DRAFT_FIELDS,
    ...overrides,
    images: [],
    confirmSlugChange: false,
  });
  if (!created.ok) throw new Error("workshop seed failed");
  return created.value.id;
}
