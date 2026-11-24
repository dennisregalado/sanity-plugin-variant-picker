/**
 * The next highlighted row when moving by `delta` through `count` rows, wrapping at both ends.
 * From no highlight (`-1`), moving down lands on the first row and moving up on the last.
 * Returns `-1` when there are no rows.
 */
export function moveActive(index: number, count: number, delta: number): number {
  if (count <= 0) return -1
  if (index < 0 || index >= count) return delta >= 0 ? 0 : count - 1
  return (((index + delta) % count) + count) % count
}
