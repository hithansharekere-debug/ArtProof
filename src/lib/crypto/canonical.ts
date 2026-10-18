/**
 * Canonical JSON serialization for cryptographic hashing.
 * Deterministically sorts object keys, preserves array order, and formats primitives cleanly.
 * This ensures that identical JavaScript objects yield identical byte representations regardless of key insertion order.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalStringify(item));
    return `[${items.join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalStringify(val)}`);
    }
  }

  return `{${entries.join(",")}}`;
}
