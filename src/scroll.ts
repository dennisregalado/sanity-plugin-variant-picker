type Edges = {top: number; bottom: number}

/**
 * The scroll position that brings `item` into view inside `container` with the least movement,
 * like `scrollIntoView({block: 'nearest'})` but limited to one scroll container (so the page and
 * the Studio's panes never move). Both rects are in the same coordinates.
 */
export function nearestScrollTop(container: Edges, item: Edges, scrollTop: number): number {
  const above = container.top - item.top
  const below = item.bottom - container.bottom
  // Taller than the container: align its top.
  if (above > 0 || item.bottom - item.top > container.bottom - container.top) {
    return scrollTop - above
  }
  if (below > 0) return scrollTop + below
  return scrollTop
}

/** Scrolls `container` so its `[data-selected]` descendant (a selected `@sanity/ui` button) shows. */
export function scrollSelectedIntoView(container: HTMLElement | null): void {
  const item = container?.querySelector<HTMLElement>('[data-selected]')
  if (!container || !item) return
  const box = container.getBoundingClientRect()
  const rect = item.getBoundingClientRect()
  // The popover animates in with a transform: measure in the container's own (unscaled) pixels.
  const scale = container.offsetHeight ? box.height / container.offsetHeight : 1
  const next = nearestScrollTop(
    {top: 0, bottom: container.clientHeight},
    {top: (rect.top - box.top) / scale, bottom: (rect.bottom - box.top) / scale},
    container.scrollTop,
  )
  if (next !== container.scrollTop) container.scrollTop = next
}
