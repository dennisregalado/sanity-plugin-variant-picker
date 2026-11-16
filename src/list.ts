import type {StringOptions, TitledListValue} from 'sanity'

/** One option of the field's `options.list`, normalized. */
export type VariantItem = {_key?: string; title: string; value: string}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const isTitled = (option: unknown): option is TitledListValue<string> =>
  typeof option === 'object' && option !== null && 'title' in option

/**
 * Reads `options.list` the way Sanity's native string select does: `{title, value}` items are
 * kept, plain strings become `{title: Capitalized, value}`. Items without a value are skipped.
 */
export function toItems(list: StringOptions['list']): VariantItem[] {
  return (list ?? []).flatMap((option) => {
    if (isTitled(option)) {
      return option.value === undefined
        ? []
        : [{_key: option._key, title: option.title, value: option.value}]
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
