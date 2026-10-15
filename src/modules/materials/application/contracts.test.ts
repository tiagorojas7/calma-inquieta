import { describe, expect, it, expectTypeOf } from "vitest";
import type { AdminActor } from "~/modules/admin-access";
import { DEFAULT_VARIANT_LABEL } from "~/modules/materials";
import type { AdminFailure, Invalid, NotFound } from "~/modules/_shared";
import type {
  MaterialError,
  MaterialField,
  SupplierField,
  SuppliersService,
  MaterialsService,
} from "~/modules/materials";

type ErrorOf<P> =
  Awaited<P> extends infer R
    ? R extends { readonly ok: false; readonly error: infer E }
      ? E
      : never
    : never;
type IsNever<T> = [T] extends [never] ? true : false;

describe("materials contracts", () => {
  it("has complete supplier and material services and default label", () => {
    expectTypeOf<SuppliersService["create"]>()
      .parameter(0)
      .toEqualTypeOf<AdminActor>();
    expectTypeOf<MaterialsService["listSelectable"]>()
      .parameter(0)
      .toEqualTypeOf<AdminActor>();
    expect([
      "list",
      "get",
      "create",
      "update",
      "archive",
      "reactivate",
    ] as const).toHaveLength(6);
    expect([
      "list",
      "listSelectable",
      "get",
      "create",
      "update",
      "deactivate",
      "reactivate",
      "categorySuggestions",
    ] as const).toHaveLength(8);
    expectTypeOf<import("~/modules/materials").MaterialDraft>().toHaveProperty(
      "variants",
    );
    expectTypeOf<
      import("~/modules/materials").MaterialVariant
    >().toHaveProperty("used");
    expectTypeOf<import("~/modules/materials").MaterialLookup["findByIds"]>()
      .parameter(0)
      .toEqualTypeOf<readonly string[]>();
    expect(DEFAULT_VARIANT_LABEL).toBe("Única");
  });
});

describe("materials contract signatures", () => {
  it("lists exactly the supplier and material service keys", () => {
    const supplierKeys = [
      "list",
      "get",
      "create",
      "update",
      "archive",
      "reactivate",
    ] as const satisfies readonly (keyof SuppliersService)[];
    const materialKeys = [
      "list",
      "listSelectable",
      "get",
      "create",
      "update",
      "deactivate",
      "reactivate",
      "categorySuggestions",
    ] as const satisfies readonly (keyof MaterialsService)[];
    expect(supplierKeys).toHaveLength(6);
    expectTypeOf<keyof SuppliersService>().toEqualTypeOf<
      (typeof supplierKeys)[number]
    >();
    expect(materialKeys).toHaveLength(8);
    expectTypeOf<keyof MaterialsService>().toEqualTypeOf<
      (typeof materialKeys)[number]
    >();
  });

  it("takes AdminActor first on every method", () => {
    expectTypeOf<
      Parameters<SuppliersService[keyof SuppliersService]>[0]
    >().toEqualTypeOf<AdminActor>();
    expectTypeOf<
      Parameters<MaterialsService[keyof MaterialsService]>[0]
    >().toEqualTypeOf<AdminActor>();
  });

  it("declares explicit error unions without unknown", () => {
    expectTypeOf<
      ErrorOf<ReturnType<SuppliersService["create"]>>
    >().toEqualTypeOf<AdminFailure | Invalid<SupplierField>>();
    expectTypeOf<
      ErrorOf<ReturnType<SuppliersService["update"]>>
    >().toEqualTypeOf<AdminFailure | NotFound | Invalid<SupplierField>>();
    expectTypeOf<
      ErrorOf<ReturnType<SuppliersService["archive"]>>
    >().toEqualTypeOf<AdminFailure | NotFound>();
    expectTypeOf<
      ErrorOf<ReturnType<SuppliersService["reactivate"]>>
    >().toEqualTypeOf<AdminFailure | NotFound | Invalid<"name">>();
    expectTypeOf<
      ErrorOf<ReturnType<MaterialsService["create"]>>
    >().toEqualTypeOf<AdminFailure | MaterialError>();
    expectTypeOf<
      ErrorOf<ReturnType<MaterialsService["update"]>>
    >().toEqualTypeOf<AdminFailure | NotFound | MaterialError>();
    expectTypeOf<MaterialError>().toEqualTypeOf<
      Invalid<MaterialField> | { readonly kind: "variant-in-use" }
    >();
    expectTypeOf<Parameters<MaterialsService["list"]>[1]>().toExtend<{
      readonly state: "active" | "inactive" | "all";
    }>();
    expectTypeOf<
      ErrorOf<ReturnType<MaterialsService["list"]>>
    >().toEqualTypeOf<AdminFailure>();
  });

  it("excludes NotFound from create errors", () => {
    const supplier: IsNever<
      Extract<ErrorOf<ReturnType<SuppliersService["create"]>>, NotFound>
    > = true;
    const material: IsNever<
      Extract<ErrorOf<ReturnType<MaterialsService["create"]>>, NotFound>
    > = true;
    expect([supplier, material]).toEqual([true, true]);
  });
});
