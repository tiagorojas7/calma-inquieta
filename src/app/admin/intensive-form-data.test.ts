import { describe, expect, it } from "vitest";
import {
  invalidIntensiveResponse,
  newProjectDrafts,
  parseIntensiveDraft,
  parseIntensiveFilter,
  parseIntensiveFilterKey,
  parseNewProjectBlocks,
} from "./intensive-form-data";

function form(entries: readonly [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("intensive form data", () => {
  it("parses every draft field untouched, including every uploaded gallery entry", () => {
    expect(
      parseIntensiveDraft(
        form([
          ["name", " Cerámica de sábado "],
          ["slug", ""],
          ["summary", "Un resumen"],
          ["description", "Un detalle"],
          ["teacherId", "t1"],
          ["percentage", "35,5"],
          ["eventDate", "2026-10-10"],
          ["startsAt", "10:00"],
          ["endsAt", "13:00"],
          ["capacity", "12"],
          ["minSeats", "4"],
          ["policyText", "Traé delantal."],
          ["materialsIncluded", "on"],
          ["galleryAssetId", "img-1"],
          ["gallerySrc", "/imagenes/img-1.webp"],
          ["galleryAlt", "Una taza"],
          ["galleryAssetId", "img-2"],
          ["gallerySrc", "/imagenes/img-2.webp"],
          ["galleryAlt", "Una mesa"],
        ]),
      ),
    ).toEqual({
      name: " Cerámica de sábado ",
      slug: "",
      summary: "Un resumen",
      description: "Un detalle",
      teacherId: "t1",
      percentage: "35,5",
      eventDate: "2026-10-10",
      startsAt: "10:00",
      endsAt: "13:00",
      capacity: "12",
      minSeats: "4",
      policyText: "Traé delantal.",
      materialsIncluded: true,
      images: [
        {
          assetId: "img-1",
          src: "/imagenes/img-1.webp",
          alt: "Una taza",
        },
        {
          assetId: "img-2",
          src: "/imagenes/img-2.webp",
          alt: "Una mesa",
        },
      ],
    });
  });

  it("has no price or deposit of its own: the workshop is not a project", () => {
    const draft = parseIntensiveDraft(
      form([
        ["price", "30000"],
        ["deposit", "10000"],
      ]),
    );

    expect(draft).not.toHaveProperty("price");
    expect(draft).not.toHaveProperty("deposit");
  });

  describe("the project blocks of a new workshop", () => {
    it("reads every block by its index, in order, with its image and its bill as typed", () => {
      const blocks = parseNewProjectBlocks(
        form([
          ["project0Name", " Taza de torno "],
          ["project0Price", "45000"],
          ["project0Deposit", "15000"],
          ["project0Description", "Tu primera taza."],
          ["project0ImageAssetId", "img-1"],
          ["project0ImageSrc", "/imagenes/img-1.webp"],
          ["project0ImageAlt", "Una taza"],
          ["project0MaterialVariant0", "v-1"],
          ["project0MaterialQuantity0", "2"],
          ["project0MaterialVariant1", "v-2"],
          ["project0MaterialQuantity1", " x "],
          ["project1Name", "Plato"],
          ["project1Price", "30000"],
          ["project1Deposit", "10000"],
          ["price", "1"],
          ["name", "Workshop"],
        ]),
      );

      expect(blocks).toEqual([
        {
          name: " Taza de torno ",
          price: "45000",
          deposit: "15000",
          description: "Tu primera taza.",
          image: {
            assetId: "img-1",
            src: "/imagenes/img-1.webp",
            alt: "Una taza",
          },
          materials: [
            { variantId: "v-1", quantity: "2" },
            { variantId: "v-2", quantity: " x " },
          ],
        },
        {
          name: "Plato",
          price: "30000",
          deposit: "10000",
          description: "",
          image: null,
          materials: [],
        },
      ]);
    });

    it("orders the blocks and the bill lines by their numbers, not by where they were posted", () => {
      const blocks = parseNewProjectBlocks(
        form([
          ["project10Name", "Tercero"],
          ["project2Name", "Segundo"],
          ["project0MaterialQuantity10", "5"],
          ["project0MaterialVariant10", "v-b"],
          ["project0MaterialVariant2", "v-a"],
          ["project0MaterialQuantity2", "1"],
          ["project0Name", "Primero"],
        ]),
      );

      expect(blocks.map((block) => block.name)).toEqual([
        "Primero",
        "Segundo",
        "Tercero",
      ]);
      expect(blocks[0]?.materials).toEqual([
        { variantId: "v-a", quantity: "1" },
        { variantId: "v-b", quantity: "5" },
      ]);
    });

    it("keeps a block with no image and reads no block from unrelated fields", () => {
      expect(parseNewProjectBlocks(form([]))).toEqual([]);
      expect(
        parseNewProjectBlocks(
          form([
            ["projectName", "x"],
            ["name", "y"],
          ]),
        ),
      ).toEqual([]);
      expect(
        parseNewProjectBlocks(form([["project0Name", "x"]]))[0]?.image,
      ).toBeNull();
    });

    it("drops the preview address when the blocks become drafts", () => {
      const [draft] = newProjectDrafts(
        parseNewProjectBlocks(
          form([
            ["project0Name", "Taza"],
            ["project0ImageAssetId", "img-1"],
            ["project0ImageSrc", "/imagenes/img-1.webp"],
            ["project0ImageAlt", "Una taza"],
          ]),
        ),
      );

      expect(draft?.image).toEqual({ assetId: "img-1", alt: "Una taza" });
    });
  });

  describe("a refused new-workshop form", () => {
    const blocks = parseNewProjectBlocks(
      form([
        ["project0Name", "Taza"],
        ["project1Name", ""],
      ]),
    );

    it("answers 422 with what was typed, every block and a message beside each field", () => {
      const response = invalidIntensiveResponse(
        parseIntensiveDraft(form([["name", "Taller"]])),
        [
          { field: "name", code: "required" },
          { field: "project1Name", code: "required" },
          { field: "project1Deposit", code: "exceeds-price" },
          { field: "project1Description", code: "too-long" },
          { field: "project1Image", code: "required" },
          { field: "project1MaterialVariant0", code: "unknown-reference" },
          { field: "project1MaterialVariant1", code: "duplicate" },
          { field: "project1MaterialQuantity1", code: "out-of-range" },
        ],
        blocks,
      );

      expect(response.init?.status).toBe(422);
      expect(response.data.values.name).toBe("Taller");
      expect(response.data.projects).toEqual(blocks);
      expect(response.data.errors).toEqual({
        name: "Completá este campo.",
        project1Name: "Completá este campo.",
        project1Deposit: "No puede superar el precio.",
        project1Description: "La descripción es demasiado larga. Acortala.",
        project1Image: "Describí la imagen en el texto alternativo.",
        project1MaterialVariant0:
          "Ese material no está disponible en el catálogo.",
        project1MaterialVariant1:
          "Ese material ya está en la lista de este proyecto. Cambiá su cantidad.",
        project1MaterialQuantity1:
          "La cantidad tiene que ser un número entero de 1 a 20.",
      });
    });
  });

  it("defaults missing fields and gallery to empty values", () => {
    expect(parseIntensiveDraft(form([]))).toMatchObject({
      name: "",
      teacherId: "",
      materialsIncluded: false,
      images: [],
    });
  });

  it("defaults to live records and maps each explicit status", () => {
    expect(parseIntensiveFilterKey(null)).toBe("vigentes");
    expect(parseIntensiveFilter("unexpected")).toBe("live");
    expect(parseIntensiveFilter("borradores")).toBe("draft");
    expect(parseIntensiveFilter("publicados")).toBe("published");
    expect(parseIntensiveFilter("pausados")).toBe("paused");
    expect(parseIntensiveFilter("cancelados")).toBe("cancelled");
    expect(parseIntensiveFilter("archivados")).toBe("archived");
  });
});
