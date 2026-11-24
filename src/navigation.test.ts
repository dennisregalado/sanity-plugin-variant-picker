import {describe, expect, it} from 'vitest'

import {moveActive} from './navigation'

describe('moveActive', () => {
  it('has no highlight without rows', () => {
    expect(moveActive(0, 0, 1)).toBe(-1)
    expect(moveActive(-1, 0, -1)).toBe(-1)
  })

  it('starts at the first row going down and the last going up', () => {
    expect(moveActive(-1, 3, 1)).toBe(0)
    expect(moveActive(-1, 3, -1)).toBe(2)
  })

  it('moves and wraps at both ends', () => {
    expect(moveActive(0, 3, 1)).toBe(1)
    expect(moveActive(2, 3, 1)).toBe(0)
    expect(moveActive(0, 3, -1)).toBe(2)
    expect(moveActive(1, 3, -1)).toBe(0)
  })

  it('restarts when the index is out of range (the list shrank)', () => {
    expect(moveActive(5, 3, 1)).toBe(0)
    expect(moveActive(5, 3, -1)).toBe(2)
  })
})
