import { describe, expect, it } from "vitest";
import { readMediaBinding } from "./r2";

const bucket = {
  put: () => Promise.resolve(null),
  get: () => Promise.resolve(null),
  delete: () => Promise.resolve(),
};

describe("readMediaBinding", () => {
  it("returns the bucket when MEDIA has put, get and delete", () => {
    expect(readMediaBinding({ MEDIA: bucket })).toBe(bucket);
  });

  it("returns null when the binding is absent", () => {
    expect(readMediaBinding({})).toBeNull();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a string", "bucket"],
    ["an empty object", {}],
    ["a bucket without delete", { put: bucket.put, get: bucket.get }],
    ["a bucket with a non-function get", { ...bucket, get: 1 }],
  ])("returns null when MEDIA is %s", (_name, value) => {
    expect(readMediaBinding({ MEDIA: value })).toBeNull();
  });
});
