import type {
  OfferedMaterial,
  OfferedMaterialsLookup,
} from "~/modules/enrollments/application/offered-materials";

export class InMemoryOfferedMaterials implements OfferedMaterialsLookup {
  private readonly byPeriod: Map<string, readonly OfferedMaterial[]>;

  constructor(
    initial: Readonly<Record<string, readonly OfferedMaterial[]>> = {},
  ) {
    this.byPeriod = new Map(Object.entries(initial));
  }

  set(periodId: string, materials: readonly OfferedMaterial[]): void {
    this.byPeriod.set(periodId, materials);
  }

  listForPeriod(periodId: string): Promise<readonly OfferedMaterial[]> {
    return Promise.resolve(this.byPeriod.get(periodId) ?? []);
  }
}
