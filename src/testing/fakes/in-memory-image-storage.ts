import type { ImageContentType } from "~/modules/media";
import type { ImageStorage } from "~/modules/media/application/image-storage";

interface StoredImage {
  bytes: Uint8Array;
  contentType: ImageContentType;
}

/** Object store in memory. Records every call and can be told to fail. */
export class InMemoryImageStorage implements ImageStorage {
  private readonly objects = new Map<string, StoredImage>();
  readonly putCalls: {
    key: string;
    bytes: Uint8Array;
    contentType: ImageContentType;
  }[] = [];
  readonly deleteCalls: string[] = [];
  failPut = false;
  failDelete = false;
  failGet = false;

  get keys(): string[] {
    return [...this.objects.keys()];
  }

  put(
    key: string,
    bytes: Uint8Array,
    contentType: ImageContentType,
  ): Promise<void> {
    this.putCalls.push({ key, bytes, contentType });
    if (this.failPut) return Promise.reject(new Error("storage put failed"));
    if (this.objects.has(key))
      return Promise.reject(new Error(`object already exists: ${key}`));
    this.objects.set(key, { bytes: bytes.slice(), contentType });
    return Promise.resolve();
  }

  get(key: string): Promise<StoredImage | null> {
    if (this.failGet) return Promise.reject(new Error("storage get failed"));
    const object = this.objects.get(key);
    return Promise.resolve(
      object
        ? { bytes: object.bytes.slice(), contentType: object.contentType }
        : null,
    );
  }

  delete(key: string): Promise<void> {
    this.deleteCalls.push(key);
    if (this.failDelete)
      return Promise.reject(new Error("storage delete failed"));
    this.objects.delete(key);
    return Promise.resolve();
  }
}
