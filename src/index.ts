import {definePlugin, defineType} from 'sanity'

import {VariantPickerInput} from './input'

/**
 * Registers a `variantPicker` field type: a native `string` with a searchable popover input.
 * It reads `options.list` exactly like a string field (`{title, value}` items or plain strings)
 * and stores the picked item's `value`.
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
export const variantPicker = definePlugin(() => ({
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
}))

export {VariantPickerInput} from './input'
export {filterItems, toItems, type VariantItem} from './list'
