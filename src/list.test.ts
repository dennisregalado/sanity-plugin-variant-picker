import React from 'react'
import {describe, expect, it} from 'vitest'

import {
  filterItems,
  groupItems,
  normalizeText,
  toItems,
  type VariantGroup,
  type VariantListItem,
} from './list'

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

describe('description', () => {
  it('keeps a trimmed string description and drops blank or non-string ones', () => {
    const [a, b, c] = toItems([
      {title: 'A', value: 'a', description: '  Fits 6–8 '},
      {title: 'B', value: 'b', description: '   '},
      {title: 'C', value: 'c', description: 3},
    ] as never)
    expect(a.description).toBe('Fits 6–8')
    expect(b).not.toHaveProperty('description')
    expect(c).not.toHaveProperty('description')
  })
})

describe('normalizeText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeText('Café')).toBe('cafe')
    expect(normalizeText('CRÈME Brûlée')).toBe('creme brulee')
    expect(normalizeText('Ñandú Ångström')).toBe('nandu angstrom')
  })

  it('folds precomposed and decomposed forms alike', () => {
    expect(normalizeText('e\u0301')).toBe(normalizeText('\u00e9'))
  })
})

describe('groups', () => {
  const list: VariantListItem[] = [
    {title: 'Small', value: 'sm', group: 'Sizes'},
    {title: 'Red', value: 'red', group: 'Colors'},
    {title: 'Large', value: 'lg', group: 'Sizes'},
    {title: 'Custom', value: 'custom'},
    {title: 'Blue', value: 'blue', group: ' Colors '},
  ]

  it('orders items by group, in order of first appearance, keeping order within a group', () => {
    expect(toItems(list).map((i) => i.value)).toEqual(['sm', 'lg', 'red', 'blue', 'custom'])
  })

  it('leaves a list without groups in order and drops blank groups', () => {
    const items = toItems(['b', {title: 'A', value: 'a', group: ' '}, 'c'] as never)
    expect(items.map((i) => i.value)).toEqual(['b', 'a', 'c'])
    expect(items[1]).not.toHaveProperty('group')
    expect(groupItems(items)).toEqual([{title: undefined, items}])
  })

  it('splits items into sections, with ungrouped items untitled', () => {
    const summary = (group: VariantGroup) => [group.title, group.items.map((i) => i.value)]
    expect(groupItems(toItems(list)).map(summary)).toEqual([
      ['Sizes', ['sm', 'lg']],
      ['Colors', ['red', 'blue']],
      [undefined, ['custom']],
    ])
  })

  it('keeps the flat order, for keyboard navigation', () => {
    const items = toItems(list)
    expect(groupItems(items).flatMap((g) => g.items)).toEqual(items)
  })

  it('hides groups emptied by a search and keeps the count of items', () => {
    const matches = filterItems(toItems(list), 'u')
    expect(matches.map((i) => i.value)).toEqual(['blue', 'custom'])
    expect(groupItems(matches).map((g) => g.title)).toEqual(['Colors', undefined])
    expect(groupItems(filterItems(toItems(list), 'red')).map((g) => g.title)).toEqual(['Colors'])
  })

  it('matches every item of a group by its name', () => {
    expect(filterItems(toItems(list), 'size').map((i) => i.value)).toEqual(['sm', 'lg'])
  })

  it('returns no sections for no items', () => {
    expect(groupItems([])).toEqual([])
  })
})

describe('filterItems: accents and descriptions', () => {
  const list: VariantListItem[] = [
    {title: 'Café', value: 'cafe-au-lait'},
    {title: 'Crème', value: 'creme', description: 'Warm off-white, like crème fraîche'},
    {title: 'Iron Black', value: 'iron-black', description: 'Matte finish'},
  ]
  const items = toItems(list)

  it('matches regardless of accents, either way', () => {
    expect(filterItems(items, 'cafe').map((i) => i.title)).toEqual(['Café'])
    expect(filterItems(items, 'CAFÉ').map((i) => i.title)).toEqual(['Café'])
    expect(filterItems(items, 'creme').map((i) => i.title)).toEqual(['Crème'])
  })

  it('matches the description', () => {
    expect(filterItems(items, 'matte').map((i) => i.value)).toEqual(['iron-black'])
    expect(filterItems(items, 'fraiche').map((i) => i.value)).toEqual(['creme'])
  })
})
