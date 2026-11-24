import {createContext, useContext} from 'react'

/**
 * The picker's wording. Every key is optional: a missing key falls back to the plugin-wide
 * `variantPicker({labels})`, then to the default.
 *
 * Strings that show a number or the search text take either a template, where `{count}` /
 * `{query}` is replaced, or a function (for plurals or other grammar).
 *
 * @example
 * ```ts
 * options: {
 *   list: ['sm', 'md', 'lg'],
 *   labels: {
 *     placeholder: 'Search a size',
 *     listTitle: 'Sizes',
 *     replace: 'Replace size',
 *     empty: 'No sizes',
 *     noMatches: 'No sizes match “{query}”',
 *     results: (count) => `${count} ${count === 1 ? 'size' : 'sizes'}`,
 *   },
 * }
 * ```
 */
export interface VariantPickerLabels {
  /** The search input's placeholder. Default "Search a variant". */
  placeholder?: string
  /** The heading above the list. Default "Variants". */
  listTitle?: string
  /** The pencil button's tooltip and accessible name. Default "Replace variant". */
  replace?: string
  /** Shown when `options.list` has no items. Default "No variants". */
  empty?: string
  /**
   * Shown when a search matches nothing; `{query}` is the trimmed search text.
   * Default `No variants match “{query}”`.
   */
  noMatches?: string | ((query: string) => string)
  /**
   * The heading above the list while searching; `{count}` is the number of matches.
   * Default "1 result" / "N results".
   */
  results?: string | ((count: number) => string)
}

/** {@link VariantPickerLabels} with every key filled in. */
export type ResolvedVariantPickerLabels = Required<VariantPickerLabels>

/** The default wording. */
export const defaultLabels: ResolvedVariantPickerLabels = {
  placeholder: 'Search a variant',
  listTitle: 'Variants',
  replace: 'Replace variant',
  empty: 'No variants',
  noMatches: (query) => `No variants match “${query}”`,
  results: (count) => `${count} ${count === 1 ? 'result' : 'results'}`,
}

/** Keeps only the keys set to a non-empty value, so an empty string falls through. */
function defined(labels: VariantPickerLabels | undefined): VariantPickerLabels {
  if (!labels || typeof labels !== 'object') return {}
  return Object.fromEntries(
    Object.entries(labels).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  ) as VariantPickerLabels
}

/**
 * Merges label sets, most specific first, over the defaults. Unset or empty keys fall through to
 * the next set.
 */
export function resolveLabels(
  ...sources: Array<VariantPickerLabels | undefined>
): ResolvedVariantPickerLabels {
  return sources.reduceRight<ResolvedVariantPickerLabels>(
    (merged, source) => ({...merged, ...defined(source)}),
    defaultLabels,
  )
}

/** Fills a `{name}` template, or calls a function label, with `value`. */
export function formatLabel<T extends string | number>(
  label: string | ((arg: T) => string),
  name: string,
  value: T,
): string {
  return typeof label === 'function' ? label(value) : label.split(`{${name}}`).join(String(value))
}

/** The schema keys the picker reads its wording from. */
type FieldLabelOptions = {labels?: VariantPickerLabels; placeholder?: string} | undefined

/**
 * A field's wording: `options.labels`, then `options.placeholder` (kept because Sanity drops a
 * field-level `placeholder` on types that extend `string`) and a field-level `placeholder`, then
 * the plugin-wide labels, then the defaults.
 */
export function fieldLabels(
  schemaType: {options?: unknown; placeholder?: string},
  pluginLabels?: VariantPickerLabels,
): ResolvedVariantPickerLabels {
  const options = schemaType.options as FieldLabelOptions
  return resolveLabels(
    options?.labels,
    {placeholder: options?.placeholder || schemaType.placeholder},
    pluginLabels,
  )
}

/** Plugin-wide labels from `variantPicker({labels})`, provided around the Studio layout. */
export const VariantPickerLabelsContext = createContext<VariantPickerLabels | undefined>(undefined)

/** The plugin-wide labels, if any. */
export const usePluginLabels = (): VariantPickerLabels | undefined =>
  useContext(VariantPickerLabelsContext)
