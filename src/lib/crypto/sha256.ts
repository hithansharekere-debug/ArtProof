/**
 * Universal SHA-256 cryptographic digest calculation.
 * Seamlessly leverages Web Crypto API (`crypto.subtle.digest`) in browsers
 * and Node.js `node:crypto` in Vitest/SSR environments.
 */

export async function computeSha256FromBuffer(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // Check if Web Crypto API is available (modern browsers & Node 19+)
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Node.js fallback
  try {
    const nodeCrypto = await import("crypto");
    const hash = nodeCrypto.createHash("sha256");
    hash.update(bytes);
    return hash.digest("hex");
  } catch (err) {
    throw new Error(`No cryptographic implementation available: ${String(err)}`);
  }
}

export async function computeSha256FromString(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  return computeSha256FromBuffer(data);
}

export async function computeSha256FromFile(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  return computeSha256FromBuffer(buffer);
}
