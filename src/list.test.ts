import React from 'react'
import {describe, expect, it} from 'vitest'

import {filterItems, toItems} from './list'

const Icon = () => React.createElement('svg')
const ForwardRefIcon = React.forwardRef<SVGSVGElement>(function ForwardRefIcon(_props, ref) {
  return React.createElement('svg', {ref})
})

describe('toItems', () => {
  it('reads an empty or missing list as no items', () => {
    expect(toItems(undefined)).toEqual([])
    expect(toItems([])).toEqual([])
  })

  it('keeps {title, value} items and capitalizes plain strings, like the native select', () => {
    expect(toItems([{title: 'Light', value: 'light'}, 'dark'])).toEqual([
      {_key: undefined, title: 'Light', value: 'light', icon: undefined},
      {title: 'Dark', value: 'dark'},
    ])
  })

  it('keeps _key', () => {
    expect(toItems([{_key: 'a', title: 'A', value: 'a'}])[0]._key).toBe('a')
  })

  it('skips items without a string value', () => {
    const list = [
      {title: 'No value'},
      {title: 'Number', value: 1},
      {title: 'Null', value: null},
      2,
      null,
      {title: 'Ok', value: 'ok'},
    ] as never
    expect(toItems(list).map((item) => item.value)).toEqual(['ok'])
  })

  it('stringifies a non-string title', () => {
    expect(toItems([{title: 42, value: 'x'}] as never)[0].title).toBe('42')
  })

  it('turns icon components, forwardRef icons and emoji into elements', () => {
    const [fn, fwd, emoji, element, none] = toItems([
      {title: 'Fn', value: 'fn', icon: Icon},
      {title: 'Fwd', value: 'fwd', icon: ForwardRefIcon},
      {title: 'Emoji', value: 'emoji', icon: '🌙'},
      {title: 'Element', value: 'element', icon: React.createElement('span')},
      {title: 'None', value: 'none', icon: ''},
    ] as never)
    expect(React.isValidElement(fn.icon)).toBe(true)
    expect(React.isValidElement(fwd.icon)).toBe(true)
    expect(React.isValidElement(emoji.icon)).toBe(true)
    expect(React.isValidElement(element.icon)).toBe(true)
    expect(none.icon).toBeUndefined()
  })
})

describe('filterItems', () => {
  const items = toItems([
    {title: 'Natural Walnut', value: 'natural-walnut'},
    {title: 'Iron Black', value: 'iron-black'},
    'agate',
  ])

  it('returns every item for an empty or blank query', () => {
    expect(filterItems(items, '')).toHaveLength(3)
    expect(filterItems(items, '   ')).toHaveLength(3)
  })

  it('matches the title or the value, case-insensitively', () => {
    expect(filterItems(items, 'WALNUT').map((i) => i.value)).toEqual(['natural-walnut'])
    expect(filterItems(items, 'iron-b').map((i) => i.value)).toEqual(['iron-black'])
    expect(filterItems(items, ' agate ').map((i) => i.value)).toEqual(['agate'])
  })

  it('returns nothing when nothing matches', () => {
    expect(filterItems(items, 'oak')).toEqual([])
  })
})
