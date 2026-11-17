import { describe, expect, it } from "vitest";
import {
  parseProjectDirection,
  parseProjectDraft,
  parseProjectId,
  rejectedProject,
} from "./intensive-project-form-data";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("parseProjectDraft", () => {
  it("reads the typed fields and the chosen image", () => {
    expect(
      parseProjectDraft(
        form({
          name: "Taza",
          price: "30000",
          deposit: "10000",
          imageAssetId: "a1",
          imageSrc: "/i.webp",
          imageAlt: "Una taza",
        }),
      ),
    ).toEqual({
      name: "Taza",
      price: "30000",
      deposit: "10000",
      image: { assetId: "a1", alt: "Una taza" },
    });
  });

  it("has no image when none was chosen, even if an alt text was typed", () => {
    expect(
      parseProjectDraft(form({ name: "Taza", price: "1", deposit: "1" })).image,
    ).toBeNull();
    expect(
      parseProjectDraft(
        form({ name: "Taza", price: "1", deposit: "1", imageAlt: "x" }),
      ).image,
    ).toBeNull();
  });

  it("drops the image when the owner asked to remove it", () => {
    expect(
      parseProjectDraft(
        form({
          name: "Taza",
          price: "1",
          deposit: "1",
          imageAssetId: "a1",
          imageAlt: "Una taza",
          removeImage: "on",
        }),
      ).image,
    ).toBeNull();
  });

  it("reads missing fields as empty text", () => {
    expect(parseProjectDraft(new FormData())).toEqual({
      name: "",
      price: "",
      deposit: "",
      image: null,
    });
  });
});

describe("project ids and directions", () => {
  it("reads the project id, empty when absent", () => {
    expect(parseProjectId(form({ projectId: "p1" }))).toBe("p1");
    expect(parseProjectId(new FormData())).toBe("");
  });

  it("accepts only up and down", () => {
    expect(parseProjectDirection(form({ direction: "up" }))).toBe("up");
    expect(parseProjectDirection(form({ direction: "down" }))).toBe("down");
    expect(parseProjectDirection(form({ direction: "left" }))).toBeNull();
    expect(parseProjectDirection(new FormData())).toBeNull();
  });
});

describe("rejectedProject", () => {
  it("keeps what was typed, shows the chosen image and words each issue", () => {
    const data = form({
      name: "",
      price: "1000",
      deposit: "2000",
      imageAssetId: "a1",
      imageSrc: "/i.webp",
      imageAlt: "",
    });

    const rejected = rejectedProject("p2", parseProjectDraft(data), data, [
      { field: "name", code: "required" },
      { field: "deposit", code: "exceeds-price" },
      { field: "image", code: "required" },
    ]);

    expect(rejected).toEqual({
      target: "p2",
      values: {
        name: "",
        price: "1000",
        deposit: "2000",
        image: { assetId: "a1", src: "/i.webp", alt: "" },
      },
      errors: {
        name: "Completá este campo.",
        deposit: "No puede superar el precio.",
        image: "Describí la imagen en el texto alternativo.",
      },
      formError: "Revisá los campos marcados e intentá de nuevo.",
    });
  });

  it("explains an image that no longer exists", () => {
    const data = form({ imageAssetId: "gone", imageAlt: "x" });

    const rejected = rejectedProject("new", parseProjectDraft(data), data, [
      { field: "image", code: "unknown-reference" },
    ]);

    expect(rejected.errors.image).toBe(
      "La imagen ya no existe. Volvé a subirla.",
    );
  });
});
