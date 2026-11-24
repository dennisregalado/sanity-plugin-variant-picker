import {describe, expect, it} from 'vitest'

import {defaultLabels, fieldLabels, formatLabel, resolveLabels} from './labels'

describe('resolveLabels', () => {
  it('keeps the current wording by default', () => {
    const labels = resolveLabels()
    expect(labels.placeholder).toBe('Search a variant')
    expect(labels.listTitle).toBe('Variants')
    expect(labels.replace).toBe('Replace variant')
    expect(labels.empty).toBe('No variants')
    expect(formatLabel(labels.noMatches, 'query', 'xl')).toBe('No variants match “xl”')
    expect(formatLabel(labels.results, 'count', 1)).toBe('1 result')
    expect(formatLabel(labels.results, 'count', 3)).toBe('3 results')
  })

  it('takes the first set that sets a key, most specific first', () => {
    const labels = resolveLabels({listTitle: 'Sizes'}, {listTitle: 'Options', empty: 'None'})
    expect(labels.listTitle).toBe('Sizes')
    expect(labels.empty).toBe('None')
    expect(labels.replace).toBe(defaultLabels.replace)
  })

  it('lets undefined, null and empty strings fall through', () => {
    const labels = resolveLabels(
      {listTitle: '', empty: undefined, replace: null as never},
      {listTitle: 'Options'},
    )
    expect(labels.listTitle).toBe('Options')
    expect(labels.empty).toBe('No variants')
    expect(labels.replace).toBe('Replace variant')
  })

  it('ignores a non-object', () => {
    expect(resolveLabels('nope' as never)).toEqual(defaultLabels)
  })
})

describe('formatLabel', () => {
  it('fills every {name} in a template', () => {
    expect(formatLabel('{count} of {count}', 'count', 2)).toBe('2 of 2')
    expect(formatLabel('No match for “{query}”', 'query', 'red')).toBe('No match for “red”')
  })

  it('leaves a template without the placeholder as is', () => {
    expect(formatLabel('Matches', 'count', 2)).toBe('Matches')
  })

  it('calls a function label', () => {
    expect(formatLabel((n: number) => `${n} size${n === 1 ? '' : 's'}`, 'count', 1)).toBe('1 size')
  })
})

describe('fieldLabels', () => {
  it('reads options.labels, then options.placeholder, then the plugin labels', () => {
    const labels = fieldLabels(
      {options: {labels: {listTitle: 'Sizes'}, placeholder: 'Search a size'}},
      {listTitle: 'Options', replace: 'Change'},
    )
    expect(labels.listTitle).toBe('Sizes')
    expect(labels.placeholder).toBe('Search a size')
    expect(labels.replace).toBe('Change')
  })

  it('prefers options.labels.placeholder over options.placeholder', () => {
    const schemaType = {options: {labels: {placeholder: 'A'}, placeholder: 'B'}}
    expect(fieldLabels(schemaType).placeholder).toBe('A')
  })

  it('falls back to a field-level placeholder, over the plugin labels', () => {
    expect(fieldLabels({placeholder: 'Field'}, {placeholder: 'Plugin'}).placeholder).toBe('Field')
    expect(fieldLabels({}, {placeholder: 'Plugin'}).placeholder).toBe('Plugin')
    expect(fieldLabels({}).placeholder).toBe('Search a variant')
  })
})
