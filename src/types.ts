import type {ObjectInputProps, ObjectSchemaType} from 'sanity'

import type {ColorFormat, ColorValue} from './color'

/** `value` is the resolved color. */
export type ColorPickerValue = {
  _key?: string
  _type?: 'variantPicker'
  value?: ColorValue | null
}

/** Options shared by the plugin and each field (a field's options win). */
export interface ColorOptions {
  /** How `value.css` is written. Defaults to `hex`. */
  format?: ColorFormat
  /** Keep alpha in the value. Defaults to `true`. */
  alpha?: boolean
}

/** Options for the plugin (argument to `variantPicker`). */
export type ColorPickerPluginOptions = ColorOptions

/** Field-level options. */
export type ColorPickerFieldOptions = ColorOptions

export type ColorPickerSchemaType = Omit<ObjectSchemaType, 'options'> & {
  options?: ColorPickerFieldOptions
}

export type ColorPickerInputProps = ObjectInputProps<ColorPickerValue, ColorPickerSchemaType> & {
  /** Plugin-level defaults; the field's `options` win. */
  defaults: Required<ColorOptions>
}

export type {ColorFormat, ColorValue} from './color'
