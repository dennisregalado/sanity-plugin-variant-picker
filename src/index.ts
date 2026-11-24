import {definePlugin, defineType} from 'sanity'

import {VariantPickerInput} from './input'
import type {VariantPickerLabels} from './labels'
import {createLabelsLayout} from './labelsLayout'
import {StringListInput} from './stringLists'

/** Options for {@link variantPicker}. */
export interface VariantPickerConfig {
  /**
   * Use the picker for plain `string` fields with an `options.list` too, so no schema changes
   * are needed and the field keeps `type: 'string'` (and typegen keeps its literal union).
   * Radio fields (`options.layout: 'radio'`) and fields with their own `components.input` are
   * left alone. Default `false`.
   */
  stringLists?: boolean
  /**
   * The picker's wording for every field in the workspace (`variantPicker` fields, `stringLists`
   * fields and fields that set `VariantPickerInput` themselves). A field's own `options.labels`
   * and `options.placeholder` win over these. Unset keys keep the defaults.
   *
   * @example
   * ```ts
   * variantPicker({labels: {placeholder: 'Search an option', listTitle: 'Options'}})
   * ```
   */
  labels?: VariantPickerLabels
}

/**
 * The `options` the picker reads on top of a `string` field's `list`. They're also added to
 * Sanity's `StringOptions`, so `defineField` accepts them on `string` fields (for `stringLists`
 * or a field that sets `VariantPickerInput`).
 */
export interface VariantPickerOptions {
  /** The search input's placeholder. Same as `labels.placeholder`, which wins if both are set. */
  placeholder?: string
  /** This field's wording; unset keys fall back to `variantPicker({labels})`, then the defaults. */
  labels?: VariantPickerLabels
}

declare module 'sanity' {
  // Declaration merging: the picker's options on string fields.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface StringOptions extends VariantPickerOptions {}
}

/**
 * Registers a `variantPicker` field type: a native `string` with a searchable popover input.
 * It reads `options.list` exactly like a string field (`{title, value}` items or plain strings)
 * and stores the picked item's `value`. With `stringLists: true`, plain `string` list fields get
 * the same input.
 *
 * @example
 * ```ts
 * // sanity.config.ts
 * plugins: [variantPicker()]
 *
 * // schema
 * defineField({
 *   name: 'size',
 *   type: 'variantPicker',
 *   options: {list: [{title: 'Small', value: 'sm'}, 'large']},
 * })
 * ```
 */
export const variantPicker = definePlugin<VariantPickerConfig | void>((config) => ({
  name: 'variant-picker',
  schema: {
    types: [
      defineType({
        name: 'variantPicker',
        title: 'Variant',
        type: 'string',
        components: {input: VariantPickerInput},
      }),
    ],
  },
  ...(config?.stringLists ? {form: {components: {input: StringListInput}}} : {}),
  ...(config?.labels ? {studio: {components: {layout: createLabelsLayout(config.labels)}}} : {}),
}))

export {VariantPickerInput} from './input'
export {
  defaultLabels,
  formatLabel,
  type ResolvedVariantPickerLabels,
  resolveLabels,
  type VariantPickerLabels,
} from './labels'
export {filterItems, toItems, type VariantItem} from './list'
export {isPickableStringList} from './stringLists'
