import React from 'react'
import type {StringOptions} from 'sanity'

/** An icon for a list item: a component (e.g. from `@sanity/icons`), an element, or an emoji. */
export type VariantIcon = React.ComponentType | React.ReactNode

/** A `{title, value}` item of `options.list`, plus an optional `icon`. */
export type VariantListItem = {_key?: string; title: string; value?: string; icon?: VariantIcon}

/** One option of the field's `options.list`, normalized. */
export type VariantItem = {_key?: string; title: string; value: string; icon?: React.ReactNode}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const isTitled = (option: unknown): option is VariantListItem =>
  typeof option === 'object' && option !== null && 'title' in option

const isComponent = (icon: unknown): icon is React.ElementType =>
  typeof icon === 'function' ||
  Boolean(icon && typeof icon === 'object' && '$$typeof' in icon && !React.isValidElement(icon))

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
 * Reads `options.list` the way Sanity's native string select does: `{title, value}` items are
 * kept, plain strings become `{title: Capitalized, value}`. Items without a value are skipped.
 */
export function toItems(list: StringOptions['list']): VariantItem[] {
  return (list ?? []).flatMap((option: unknown) => {
    if (isTitled(option)) {
      return option.value === undefined
        ? []
        : [
            {
              _key: option._key,
              title: option.title,
              value: option.value,
              icon: toIconNode(option.icon),
            },
          ]
    }
    return typeof option === 'string' ? [{title: capitalize(option), value: option}] : []
  })
}

/** Case-insensitive match on the title or the value. */
export function filterItems(items: VariantItem[], query: string): VariantItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) => item.title.toLowerCase().includes(q) || item.value.toLowerCase().includes(q),
  )
}
