/** Port for cryptographic randomness; production wires `crypto.getRandomValues`. */
export interface RandomBytes {
  bytes(length: number): Uint8Array;
}
