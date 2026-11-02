import { describe, expect, it } from "vitest";
import { buildMaterial } from "~/testing/fakes/admin-builders";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  MATERIAL_SUPPLIER,
  materialsFixture,
} from "~/testing/admin/material-kit";
import { action, loader } from "./material-photo";

const ID = "11111111-1111-4111-8111-111111111111";
const UNKNOWN = "99999999-9999-4999-8999-999999999999";

async function setup() {
  const fixture = await materialsFixture();
  await fixture.repository.insert(
    buildMaterial({
      id: ID,
      name: "Pincel",
      category: "Pinceles",
      supplier: MATERIAL_SUPPLIER,
      image: null,
    }),
  );
  return { fixture, id: ID, env: { materials: fixture.service } };
}

function submit(
  env: Awaited<ReturnType<typeof setup>>["env"],
  id: string,
  fields: Record<string, string>,
  query = "",
  options: { admin?: boolean } = {},
) {
  return action({
    request: postRequest(`/admin/materiales/${id}/foto${query}`, fields),
    params: { id },
    context: adminContext(env, options),
  } as never);
}

describe("admin quick photo route", () => {
  it("loads the material name and the list to go back to", async () => {
    const { env, id } = await setup();
    const result = await loader({
      request: getRequest(`/admin/materiales/${id}/foto?sinfoto=1`),
      params: { id },
      context: adminContext(env),
    } as never);
    expect(result).toEqual({
      name: "Pincel",
      backHref: "/admin/materiales?sinfoto=1",
      current: null,
    });
  });

  it("saves the uploaded image and returns to the list with the photo code", async () => {
    const { env, id, fixture } = await setup();
    const response = (await submit(
      env,
      id,
      { imageAssetId: "asset-1", imageAlt: "Pincel de cerda" },
      "?sinfoto=1",
    )) as Response;
    expect(response.headers.get("Location")).toBe(
      "/admin/materiales?sinfoto=1&ok=photo",
    );
    expect(fixture.repository.materials.get(id)?.image).toMatchObject({
      assetId: "asset-1",
      alt: "Pincel de cerda",
    });
  });

  it("answers 422 without an image or alt text and stores nothing", async () => {
    const { env, id, fixture } = await setup();
    for (const fields of [{}, { imageAssetId: "asset-1", imageAlt: " " }]) {
      const result = (await submit(env, id, fields)) as unknown as {
        init: { status: number };
        data: { formError: string };
      };
      expect(result.init.status).toBe(422);
      expect(result.data.formError).toContain("foto");
    }
    expect(fixture.repository.materials.get(id)?.image).toBeNull();
  });

  it("answers 404 for an unknown or malformed id and 403 for non-admins", async () => {
    const { env, id } = await setup();
    expect(
      await thrownStatus(() =>
        submit(env, UNKNOWN, { imageAssetId: "asset-1", imageAlt: "x" }),
      ),
    ).toBe(404);
    expect(await thrownStatus(() => submit(env, "nope", {}))).toBe(404);
    expect(
      await thrownStatus(() => submit(env, id, {}, "", { admin: false })),
    ).toBe(403);
  });
});
