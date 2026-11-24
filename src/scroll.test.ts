import {describe, expect, it} from 'vitest'

import {nearestScrollTop} from './scroll'

const container = {top: 100, bottom: 300}

describe('nearestScrollTop', () => {
  it('stays put when the item is already visible', () => {
    expect(nearestScrollTop(container, {top: 150, bottom: 180}, 40)).toBe(40)
    expect(nearestScrollTop(container, {top: 100, bottom: 300}, 40)).toBe(40)
  })

  it('scrolls down just enough to show an item below', () => {
    expect(nearestScrollTop(container, {top: 400, bottom: 430}, 0)).toBe(130)
  })

  it('scrolls up just enough to show an item above', () => {
    expect(nearestScrollTop(container, {top: 60, bottom: 90}, 200)).toBe(160)
  })

  it('aligns the top of an item taller than the container', () => {
    expect(nearestScrollTop(container, {top: 150, bottom: 450}, 0)).toBe(50)
  })
})
