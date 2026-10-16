import type { Clock } from "~/modules/_shared";
import type { ImageStorage } from "./image-storage";
import type { MediaAssetRepository } from "./media-assets";
import type { MediaService } from "./read-models";
import { serveImage } from "./serve";
import { uploadImage } from "./upload";

export interface MediaServiceDeps {
  readonly storage: ImageStorage;
  readonly repository: MediaAssetRepository;
  readonly clock: Clock;
}

export function createMediaService(deps: MediaServiceDeps): MediaService {
  return {
    upload: (actor, file) =>
      uploadImage(
        actor,
        { read: () => Promise.resolve(file.bytes) },
        deps.storage,
        deps.repository,
        deps.clock,
      ),
    serve: (fileName) => serveImage(fileName, deps.storage, deps.repository),
  };
}
