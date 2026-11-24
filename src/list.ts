import React from 'react'
import type {StringOptions} from 'sanity'

/** An icon for a list item: a component (e.g. from `@sanity/icons`), an element, or an emoji. */
export type VariantIcon = React.ComponentType | React.ReactNode

/**
 * A `{title, value}` item of `options.list`, plus optional extras the picker reads. Sanity's
 * native string input ignores the extras, so the same list works under both inputs.
 */
export type VariantListItem = {
  _key?: string
  title: string
  value?: string
  icon?: VariantIcon
  /** A second line under the title in the list, e.g. `'Fits 6–8'`. Searched too. */
  description?: string
  /**
   * A section header to list the item under, e.g. `'Sizes'`. Items with the same `group` are
   * listed together, in the order each group first appears; items without one form an untitled
   * section where the first of them appears.
   */
  group?: string
}

/** One option of the field's `options.list`, normalized. */
export type VariantItem = {
  _key?: string
  title: string
  value: string
  icon?: React.ReactNode
  /** See {@link VariantListItem.description}. */
  description?: string
  /** See {@link VariantListItem.group}. */
  group?: string
}

/** A run of consecutive items sharing a `group`: a section of the list. */
export type VariantGroup = {
  /** The header, or `undefined` for ungrouped items (no header). */
  title?: string
  items: VariantItem[]
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const isTitled = (option: unknown): option is VariantListItem =>
  typeof option === 'object' && option !== null && 'title' in option

const isComponent = (icon: unknown): icon is React.ElementType =>
  typeof icon === 'function' ||
  Boolean(icon && typeof icon === 'object' && '$$typeof' in icon && !React.isValidElement(icon))

/** A non-blank string, trimmed; anything else is dropped. */
const optionalText = (text: unknown): string | undefined =>
  typeof text === 'string' && text.trim() ? text.trim() : undefined

/**
 * Icons become elements so the preview renders them as media: components are created, and text
 * (an emoji) is wrapped, since the preview would read a bare string as an image URL.
 */
function toIconNode(icon: VariantIcon | undefined): React.ReactNode {
  if (icon === undefined || icon === null || icon === false || icon === '') return undefined
  if (isComponent(icon)) return React.createElement(icon)
  if (typeof icon === 'string' || typeof icon === 'number') {
    return React.createElement('span', {style: {fontSize: '1.25em', lineHeight: 1}}, icon)
  }
  return icon as React.ReactNode
}

/**
 * Gathers items by `group`, in the order each group first appears (ungrouped items count as one
 * group), keeping the list order within a group. A list without groups is returned as is.
 */
function gatherGroups(items: VariantItem[]): VariantItem[] {
  if (!items.some((item) => item.group)) return items
  const byGroup = new Map<string | undefined, VariantItem[]>()
  for (const item of items) {
    const group = byGroup.get(item.group)
    if (group) group.push(item)
    else byGroup.set(item.group, [item])
  }
  return [...byGroup.values()].flat()
}

/**
 * Reads `options.list` the way Sanity's native string select does: `{title, value}` items are
 * kept, plain strings become `{title: Capitalized, value}`. Items without a value are skipped.
 * Items are ordered by `group` (see {@link VariantListItem.group}), so the result is the list's
 * render order: split it into sections with {@link groupItems}.
 */
export function toItems(list: StringOptions['list']): VariantItem[] {
  const items = (list ?? []).flatMap((option: unknown): VariantItem[] => {
    if (isTitled(option)) {
      // A string field stores strings: other values can't be picked (or searched) safely.
      if (typeof option.value !== 'string') return []
      const item: VariantItem = {
        _key: option._key,
        title: String(option.title ?? option.value),
        value: option.value,
        icon: toIconNode(option.icon),
      }
      const description = optionalText(option.description)
      const group = optionalText(option.group)
      if (description) item.description = description
      if (group) item.group = group
      return [item]
    }
    return typeof option === 'string' ? [{title: capitalize(option), value: option}] : []
  })
  return gatherGroups(items)
}

/**
 * Folds text for search: lowercased, with accents and other diacritics stripped (NFD, then
 * combining marks removed), so `'Café'` and `'cafe'` compare equal.
 */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * Case- and accent-insensitive match on the title, value, description or group (a group's name
 * matches all its items). Keeps the items' order.
 */
export function filterItems(items: VariantItem[], query: string): VariantItem[] {
  const q = normalizeText(query.trim())
  if (!q) return items
  return items.filter((item) =>
    [item.title, item.value, item.description, item.group].some(
      (text) => text !== undefined && normalizeText(text).includes(q),
    ),
  )
}

/**
 * Splits items (e.g. the result of {@link filterItems}) into sections: runs of consecutive items
 * with the same `group`. Groups with no items left after a search don't appear, and the items
 * keep their order, so `groupItems(items).flatMap((g) => g.items)` equals `items`.
 */
export function groupItems(items: VariantItem[]): VariantGroup[] {
  const groups: VariantGroup[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.title === item.group) last.items.push(item)
    else groups.push({title: item.group, items: [item]})
  }
  return groups
}
