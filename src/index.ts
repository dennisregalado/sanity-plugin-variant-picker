import {definePlugin, defineType} from 'sanity'

import {VariantPickerInput} from './input'
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
}))

export {VariantPickerInput} from './input'
export {filterItems, toItems, type VariantItem} from './list'
export {isPickableStringList} from './stringLists'
