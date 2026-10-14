import { describe } from "vitest";
import { mediaStorageContract } from "./media-storage.contract";
import { InMemoryImageStorage } from "../fakes/in-memory-image-storage";
describe("media storage contract", () => {
  mediaStorageContract(() => new InMemoryImageStorage());
});
