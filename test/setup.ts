import '@testing-library/jest-dom/vitest'

import {cleanup} from '@testing-library/react'
import {afterEach} from 'vitest'

// jsdom lacks a few browser APIs that @sanity/ui uses (reduced-motion and media queries, element
// sizing for popovers). Stub them for the component tests; Node-only tests have no `window`.
if (typeof window !== 'undefined') {
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList

  const noop = () => undefined
  window.ResizeObserver ??= class {
    observe = noop
    unobserve = noop
    disconnect = noop
  }

  // jsdom has no layout: every rect is 0×0 at the origin, so floating-ui's `hide` middleware marks
  // an open popover's reference as hidden and @sanity/ui sets `hidden` on it. Give elements and
  // the viewport a size so open popovers are visible, as in a browser.
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return DOMRect.fromRect({x: 0, y: 0, width: 300, height: 35})
  }
  for (const prop of ['clientWidth', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get() {
        return this === document.documentElement ? 768 : 0
      },
    })
  }

  afterEach(() => cleanup())
}
