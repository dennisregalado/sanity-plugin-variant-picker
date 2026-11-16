import type {ObjectInputProps, ObjectSchemaType} from 'sanity'

import type {ColorFormat, ColorValue, StoredColor} from './color'

export type ColorReferenceValue = {
  _type: 'reference'
  _ref: string
  _weak?: boolean
}

/**
 * `value` is always the resolved color. `reference` is set when it came from a preset; the
 * input keeps `value` in sync with it.
 */
export type ColorPickerValue = {
  _key?: string
  _type?: 'variantPicker'
  value?: ColorValue | null
  reference?: ColorReferenceValue | null
}

/** A preset document. `color` is the same object as a field's `value` (older docs: a string). */
export type ColorPreset = {
  _id: string
  title?: string | null
  color?: StoredColor
}

/** Options shared by the plugin and each field (a field's options win). */
export interface ColorOptions {
  /** How `value.css` is written, and the picker's starting input mode. Defaults to `hex`. */
  format?: ColorFormat
  /** Show the opacity slider and keep alpha in the value. Defaults to `true`. */
  alpha?: boolean
  /** Only allow preset: no picker, no custom values, no saving. Defaults to `false`. */
  paletteOnly?: boolean
  /** Only the picker: no preset, search, saving or references. Defaults to `false`. */
  pickerOnly?: boolean
}

/** Options for the plugin (argument to `variantPicker`). */
export interface ColorPickerPluginOptions extends ColorOptions {
  /** Name of the color preset document type. Defaults to `variantPreset`. */
  presetType?: string
}

/** Field-level options: the shared ones plus `presets`. */
export interface ColorPickerFieldOptions extends ColorOptions {
  /**
   * Limit the field to these preset document IDs, in this order (e.g. only dark colors). Saving
   * new presets from the field is turned off, and other presets fail validation.
   */
  presets?: string[]
}

export type ColorPickerSchemaType = Omit<ObjectSchemaType, 'options'> & {
  options?: ColorPickerFieldOptions
}

export type ColorPickerInputProps = ObjectInputProps<ColorPickerValue, ColorPickerSchemaType> & {
  presetType: string
  /** Plugin-level defaults; the field's `options` win. */
  defaults: Required<ColorOptions>
}

export type {ColorFormat, ColorValue} from './color'
