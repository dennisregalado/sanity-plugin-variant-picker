import type React from 'react'
import type {InputProps, SchemaType, StringInputProps, StringOptions} from 'sanity'

import {VariantPickerInput} from './input'

/** True when the type, or a type it extends, sets its own input component. */
function hasOwnInput(schemaType: SchemaType): boolean {
  for (let type: SchemaType | undefined = schemaType; type; type = type.type) {
    if (type.components?.input) return true
  }
  return false
}

/**
 * Whether `stringLists` takes over a field: a `string` with a non-empty `options.list` that isn't
 * a radio group and doesn't set its own input. Radios stay native (every option visible, one
 * click), and a field's own `components.input` always wins.
 */
export function isPickableStringList(schemaType: SchemaType): boolean {
  if (schemaType.jsonType !== 'string') return false
  const options = schemaType.options as StringOptions | undefined
  if (!Array.isArray(options?.list) || options.list.length === 0) return false
  if (options.layout === 'radio') return false
  return !hasOwnInput(schemaType)
}

/**
 * Form middleware for `stringLists`: renders the variant picker for plain `string` list fields
 * and leaves every other input to the next renderer.
 */
export function StringListInput(props: InputProps): React.JSX.Element {
  if (isPickableStringList(props.schemaType)) {
    return <VariantPickerInput {...(props as StringInputProps)} />
  }
  return props.renderDefault(props)
}
