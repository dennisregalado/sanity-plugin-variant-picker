import type {Rule, SchemaType} from 'sanity'
import {describe, expect, it} from 'vitest'

import {isRequiredType} from './required'

type Validation = SchemaType['validation']
const type = (validation: unknown) => ({validation: validation as Validation})

describe('isRequiredType', () => {
  it('is false without validation', () => {
    expect(isRequiredType(type(undefined))).toBe(false)
    expect(isRequiredType(type(false))).toBe(false)
  })

  it('reads Rule.required() from a builder', () => {
    expect(isRequiredType(type((rule: Rule) => rule.required()))).toBe(true)
    expect(isRequiredType(type((rule: Rule) => rule.required().warning()))).toBe(true)
    expect(isRequiredType(type((rule: Rule) => rule.max(3)))).toBe(false)
    expect(isRequiredType(type((rule: Rule) => rule.required().optional()))).toBe(false)
  })

  it('reads builders that return a list of rules, and lists of builders', () => {
    expect(isRequiredType(type((rule: Rule) => [rule.max(3), rule.required()]))).toBe(true)
    expect(
      isRequiredType(type([(rule: Rule) => rule.max(3), (rule: Rule) => rule.required()])),
    ).toBe(true)
  })

  it('counts a builder that throws as not required', () => {
    expect(
      isRequiredType(
        type(() => {
          throw new Error('needs context')
        }),
      ),
    ).toBe(false)
  })
})
