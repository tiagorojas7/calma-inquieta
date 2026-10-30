import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { MonthlyWorkshop } from "~/modules/workshops";
import { workshopFormValues } from "./workshop-action-data";

const parsedFee = Money.fromCentavos(1200000);
if (!parsedFee.ok) throw new Error("fixture");
const fee = parsedFee.value;

const asset = {
  id: "a1",
  fileName: "a1.jpg",
  src: "/media/a1.jpg",
  contentType: "image/jpeg" as const,
  byteSize: 1,
  width: 1,
  height: 1,
  createdBy: "seed",
  createdAt: new Date(0),
};

function workshop(images: MonthlyWorkshop["images"]): MonthlyWorkshop {
  return {
    id: "w1",
    slug: "ceramica",
    name: "Cerámica",
    summary: "",
    description: "",
    technique: "Torno",
    defaultFee: fee,
    assignment: null,
    images,
    status: "draft",
    turnos: [],
    audit: { updatedBy: "a@b.c", updatedAt: new Date(0) },
  };
}

describe("workshopFormValues", () => {
  it("hands the stored photos back with their preview source and alt", () => {
    expect(
      workshopFormValues(
        workshop([
          { assetId: "a1", alt: "Mesa", asset },
          { assetId: "gone", alt: "Perdida", asset: null },
        ]),
      ).images,
    ).toEqual([{ assetId: "a1", src: "/media/a1.jpg", alt: "Mesa" }]);
  });
});
