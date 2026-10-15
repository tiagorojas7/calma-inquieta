import { describe, expect, it } from "vitest";
import { buildMediaAsset, buildTeacher } from "~/testing/fakes/admin-builders";
import {
  projectImages,
  projectTeacher,
  publicStatus,
} from "./public-projection";

describe("projectImages", () => {
  it("builds the image allowlist with literal keys", () => {
    const asset = buildMediaAsset({
      id: "a1",
      src: "/imagenes/a1.jpg",
      width: 640,
      height: 480,
      fileName: "PRIVATE-FILE.jpg",
      createdBy: "uploader@example.test",
    });

    const images = projectImages(
      [{ assetId: "a1", alt: "Un torno" }],
      new Map([["a1", asset]]),
    );

    expect(images).toEqual([
      { src: "/imagenes/a1.jpg", alt: "Un torno", width: 640, height: 480 },
    ]);
    expect(Object.keys(images[0] ?? {})).toEqual([
      "src",
      "alt",
      "width",
      "height",
    ]);
  });

  it("drops an image whose asset the lookup omits and keeps the order of the rest (DA4)", () => {
    const first = buildMediaAsset({ id: "a1", src: "/imagenes/a1.jpg" });
    const third = buildMediaAsset({ id: "a3", src: "/imagenes/a3.jpg" });

    const images = projectImages(
      [
        { assetId: "a1", alt: "Uno" },
        { assetId: "a2", alt: "Dos" },
        { assetId: "a3", alt: "Tres" },
      ],
      new Map([
        ["a1", first],
        ["a3", third],
      ]),
    );

    expect(images.map((image) => image.alt)).toEqual(["Uno", "Tres"]);
  });
});

describe("projectTeacher", () => {
  it("returns the name and bio line only", () => {
    const teacher = buildTeacher({
      name: "Lucía",
      bioLine: "Ceramista",
      phone: "+54 9 351 000 0000",
      email: "docente@example.test",
      modality: "third_party",
    });

    const projected = projectTeacher(teacher);

    expect(projected).toEqual({ name: "Lucía", bioLine: "Ceramista" });
    expect(Object.keys(projected ?? {})).toEqual(["name", "bioLine"]);
  });

  it("shows an archived teacher (DA3)", () => {
    expect(
      projectTeacher(buildTeacher({ name: "Ana", active: false })),
    ).toEqual({ name: "Ana", bioLine: null });
  });

  it("turns an empty or blank bio line into null", () => {
    expect(projectTeacher(buildTeacher({ bioLine: "" }))?.bioLine).toBeNull();
    expect(projectTeacher(buildTeacher({ bioLine: "  " }))?.bioLine).toBeNull();
  });

  it("returns null for a missing teacher", () => {
    expect(projectTeacher(undefined)).toBeNull();
  });
});

describe("publicStatus", () => {
  it("maps published to open and paused to paused", () => {
    expect(publicStatus("published")).toBe("open");
    expect(publicStatus("paused")).toBe("paused");
  });

  it.each(["draft", "archived", "cancelled"] as const)(
    "never projects %s",
    (status) => {
      expect(() => publicStatus(status)).toThrow(status);
    },
  );
});
