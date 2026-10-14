import { runMediaAssetRepositoryContract } from "~/testing/contracts/media-asset-repository.contract";
import { InMemoryMediaAssetRepository } from "./in-memory-media-asset-repository";

runMediaAssetRepositoryContract(() =>
  Promise.resolve(new InMemoryMediaAssetRepository()),
);
