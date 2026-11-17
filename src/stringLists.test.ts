import type {SchemaType} from 'sanity'
import {describe, expect, it} from 'vitest'

import {isPickableStringList} from './stringLists'

const Input = () => null
const string = {name: 'string', jsonType: 'string'} as unknown as SchemaType

/** A field type as Sanity compiles it: a subtype of `type` with the field's own props. */
const field = (props: Record<string, unknown>, type: SchemaType = string) =>
  ({name: 'field', jsonType: type.jsonType, type, ...props}) as unknown as SchemaType

const list = [{title: 'Dark', value: 'dark'}, 'light']

describe('isPickableStringList', () => {
  it('takes string fields with a list, as a dropdown by default or explicitly', () => {
    expect(isPickableStringList(field({options: {list}}))).toBe(true)
    expect(isPickableStringList(field({options: {list, layout: 'dropdown'}}))).toBe(true)
  })

  it('leaves radio groups native', () => {
    expect(isPickableStringList(field({options: {list, layout: 'radio'}}))).toBe(false)
  })

  it('skips strings without a list, or with an empty one', () => {
    expect(isPickableStringList(field({}))).toBe(false)
    expect(isPickableStringList(field({options: {}}))).toBe(false)
    expect(isPickableStringList(field({options: {list: []}}))).toBe(false)
  })

  it('skips fields that set their own input, on the field or a type they extend', () => {
    expect(isPickableStringList(field({options: {list}, components: {input: Input}}))).toBe(false)
    const custom = field({name: 'custom', components: {input: Input}})
    expect(isPickableStringList(field({options: {list}}, custom))).toBe(false)
  })

  it('skips other json types, like a number or an array with a list', () => {
    const number = {name: 'number', jsonType: 'number'} as unknown as SchemaType
    const array = {name: 'array', jsonType: 'array'} as unknown as SchemaType
    expect(isPickableStringList(field({options: {list: [1, 2]}}, number))).toBe(false)
    expect(isPickableStringList(field({options: {list}}, array))).toBe(false)
  })
})
