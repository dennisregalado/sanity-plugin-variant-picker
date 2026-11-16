import {HighlightIcon} from '@sanity/icons/Highlight'
import {TextIcon} from '@sanity/icons/Text'
import React from 'react'
import {
  defineField,
  definePlugin,
  defineType,
  type BlockAnnotationProps,
  type ObjectInputProps,
  type SchemaTypeDefinition,
} from 'sanity'

import {ColorAnnotation} from './annotations'
import {ColorPickerInput} from './input'
import {ColorSwatch} from './swatch'
import type {
  ColorOptions,
  ColorPickerInputProps,
  ColorPickerPluginOptions,
  ColorPickerValue,
} from './types'

const channels = (name: string, title: string, keys: string[]) =>
  defineField({
    name,
    title,
    type: 'object',
    fields: keys.map((key) => defineField({name: key, type: 'number'})),
  })

/**
 * Registers a `variantPicker` field type and its `variantPickerValue` object.
 *
 * The input writes the resolved color to `value` (`css`, `hex`, `alpha`, `rgb`, `hsl`, `hsv`,
 * `oklch`), so GROQ can read `background.value.css` directly.
 *
 * @example
 * ```ts
 * // sanity.config.ts
 * plugins: [variantPicker({format: 'hex', alpha: true})]
 *
 * // schema (field options override the plugin's)
 * defineField({name: 'background', type: 'variantPicker'})
 * ```
 */
export const variantPicker = definePlugin<ColorPickerPluginOptions | void>((options) => {
  const defaults: Required<ColorOptions> = {
    format: options?.format ?? 'hex',
    alpha: options?.alpha ?? true,
  }

  const variantPickerValue = defineType({
    name: 'variantPickerValue',
    title: 'Color value',
    type: 'object',
    fields: [
      defineField({name: 'css', title: 'CSS', type: 'string'}),
      defineField({name: 'hex', title: 'Hex', type: 'string'}),
      defineField({name: 'alpha', title: 'Alpha', type: 'number'}),
      channels('rgb', 'RGB', ['r', 'g', 'b', 'a']),
      channels('hsl', 'HSL', ['h', 's', 'l', 'a']),
      channels('hsv', 'HSV', ['h', 's', 'v', 'a']),
      channels('oklch', 'OKLCH', ['l', 'c', 'h', 'a']),
    ],
  })

  /** The `{value}` color object, shared by the field and the Portable Text marks. */
  const colorObjectType = (
    name: string,
    typeTitle: string,
    extra: {icon?: React.ComponentType; annotation?: 'text' | 'highlight'} = {},
  ) =>
    defineType({
      name,
      title: typeTitle,
      type: 'object',
      icon: extra.icon,
      // Marks edit in a dialog: the field's own popover nests reliably there, unlike in the
      // default annotation popover.
      ...(extra.annotation ? {options: {modal: {type: 'dialog', width: 1}}} : {}),
      fields: [defineField({name: 'value', title: 'Color', type: 'variantPickerValue'})],
      preview: {
        select: {css: 'value.css'},
        prepare: ({css}: {css?: string}) => ({
          title: css || 'No color',
          media: React.createElement(ColorSwatch, {color: css, size: '100%'}),
        }),
      },
      components: {
        input: (props: ObjectInputProps) =>
          React.createElement(ColorPickerInput, {
            ...(props as ObjectInputProps<ColorPickerValue>),
            defaults,
          } as ColorPickerInputProps),
        ...(extra.annotation
          ? {
              annotation: (props: BlockAnnotationProps) =>
                React.createElement(ColorAnnotation, {...props, mode: extra.annotation!}),
            }
          : {}),
      },
    })

  const variantPickerType = colorObjectType('variantPicker', 'Color')
  // Portable Text marks: add to a block's `marks.annotations`.
  const variantText = colorObjectType('variantText', 'Text color', {
    icon: TextIcon,
    annotation: 'text',
  })
  const variantHighlight = colorObjectType('variantHighlight', 'Highlight', {
    icon: HighlightIcon,
    annotation: 'highlight',
  })

  return {
    name: 'variant-picker',
    schema: {
      types: [
        variantPickerValue,
        variantPickerType,
        variantText,
        variantHighlight,
      ] as SchemaTypeDefinition[],
    },
  }
})

export {
  formatColor,
  fromColorValue,
  normalizeColor,
  parseColor,
  sameColor,
  toColorValue,
  type ColorFormat,
  type ColorValue,
  type Hsva,
} from './color'
export type {
  ColorOptions,
  ColorPickerFieldOptions,
  ColorPickerInputProps,
  ColorPickerPluginOptions,
  ColorPickerValue,
} from './types'
