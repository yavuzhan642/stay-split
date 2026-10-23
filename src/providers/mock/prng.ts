/**
 * Deterministic pseudo-random number in [0, 1) derived from a string key.
 *
 * The simulator needs "random-looking" prices and sold-out nights, but the
 * same search must always return the same answer: otherwise tests flake,
 * caching is pointless and bug reports cannot be reproduced. Hashing
 * (property, date, purpose) gives a stable value per night without storing a
 * calendar. FNV-1a mixes the characters; the murmur3 finalizer spreads the
 * bits so that neighbouring dates do not get correlated values.
 */
export function unitHash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x1_0000_0000;
}
