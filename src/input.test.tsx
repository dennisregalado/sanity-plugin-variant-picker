// @vitest-environment jsdom
import {MoonIcon} from '@sanity/icons/Moon'
import {studioTheme, ThemeProvider} from '@sanity/ui'
import {isInaccessible, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {type ReactNode, useState} from 'react'
import {set, type StringInputProps, unset} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {VariantPickerInput} from './input'

// The real preview needs Studio's source context. A stand-in with its title and media is enough to
// assert what the field shows.
vi.mock('sanity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sanity')>()
  return {
    ...actual,
    SanityDefaultPreview: ({title, media}: {title?: string; media?: ReactNode}) => (
      <span>
        {media}
        {title}
      </span>
    ),
  }
})

const list = [
  {title: 'Small', value: 'sm', icon: MoonIcon},
  {title: 'Medium', value: 'md'},
  'large',
]

type Options = {
  value?: string
  readOnly?: boolean
  options?: Record<string, unknown>
}

/**
 * Renders the input like Studio would: with the theme, and holding the value in state so a
 * `set`/`unset` patch re-renders the field. `onChange` is the spy that sees each patch.
 */
function renderInput({value: initial, readOnly, options = {list}}: Options = {}) {
  const onChange = vi.fn()

  function Harness() {
    const [value, setValue] = useState<string | undefined>(initial)
    const props = {
      value,
      readOnly,
      validation: [],
      validationError: undefined,
      schemaType: {name: 'variantPicker', jsonType: 'string', options},
      elementProps: {
        id: 'field',
        ref: {current: null},
        onFocus: vi.fn(),
        onBlur: vi.fn(),
        value,
        readOnly,
        placeholder: undefined,
      },
      onChange: (patch: {type: string; value?: string}) => {
        onChange(patch)
        setValue(patch.type === 'set' ? patch.value : undefined)
      },
    } as unknown as StringInputProps
    return <VariantPickerInput {...props} />
  }

  const user = userEvent.setup()
  render(
    <ThemeProvider theme={studioTheme}>
      <Harness />
    </ThemeProvider>,
  )
  return {user, onChange}
}

/**
 * The popover can keep its content mounted (hidden) once it has rendered, so "closed" means the
 * list is absent or hidden from the accessibility tree, as role queries see it.
 */
function expectListClosed() {
  const label = screen.queryByText('Variants')
  if (label) expect(isInaccessible(label)).toBe(true)
}

describe('VariantPickerInput', () => {
  it('opens the list when the empty field is focused', async () => {
    const {user} = renderInput()
    const input = screen.getByPlaceholderText('Search a variant')
    expectListClosed()

    await user.click(input)

    expect(await screen.findByText('Variants')).toBeVisible()
    expect(screen.getByRole('button', {name: /Small/})).toBeVisible()
    expect(screen.getByRole('button', {name: /Medium/})).toBeVisible()
    expect(screen.getByRole('button', {name: /Large/})).toBeVisible()
  })

  it('uses options.placeholder', () => {
    renderInput({options: {list, placeholder: 'Pick a size'}})
    expect(screen.getByPlaceholderText('Pick a size')).toBeInTheDocument()
  })

  it('filters the list as you type and counts the results', async () => {
    const {user} = renderInput()

    await user.type(screen.getByPlaceholderText('Search a variant'), 'med')

    expect(await screen.findByText('1 result')).toBeVisible()
    expect(screen.getByRole('button', {name: /Medium/})).toBeVisible()
    expect(screen.queryByRole('button', {name: /Small/})).not.toBeInTheDocument()
  })

  it('says when nothing matches', async () => {
    const {user} = renderInput()

    await user.type(screen.getByPlaceholderText('Search a variant'), 'xyz')

    expect(await screen.findByText('0 results')).toBeVisible()
    expect(screen.getByText('No variants match “xyz”')).toBeVisible()
  })

  it('picks the first match on Enter', async () => {
    const {user, onChange} = renderInput()

    await user.type(screen.getByPlaceholderText('Search a variant'), 'l{Enter}')

    // "l" matches Small and Large; Small comes first.
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(set('sm'))
    await waitFor(expectListClosed)
    expect(screen.getByRole('button', {name: /Small/})).toBeVisible()
  })

  it('picks a clicked item', async () => {
    const {user, onChange} = renderInput()

    await user.click(screen.getByPlaceholderText('Search a variant'))
    await user.click(await screen.findByRole('button', {name: /Medium/}))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(set('md'))
    // The list closes and the picked value replaces the search input.
    await waitFor(expectListClosed)
    expect(screen.queryByPlaceholderText('Search a variant')).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: /Medium/})).toBeVisible()
  })

  it('shows the picked value with its title and icon', () => {
    renderInput({value: 'sm'})

    expect(screen.getByText('Small')).toBeInTheDocument()
    expect(document.body.querySelector('svg[data-sanity-icon="moon"]')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Replace variant'})).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search a variant')).not.toBeInTheDocument()
  })

  it('opens the list from the picked value', async () => {
    const {user} = renderInput({value: 'sm'})

    await user.click(screen.getByRole('button', {name: /Small/}))

    expect(await screen.findByText('Variants')).toBeVisible()
    expect(screen.getByRole('button', {name: /Medium/})).toBeVisible()
  })

  it('clears the value with the pencil and goes back to the search', async () => {
    const {user, onChange} = renderInput({value: 'sm'})

    await user.click(screen.getByRole('button', {name: 'Replace variant'}))

    expect(onChange).toHaveBeenCalledWith(unset())
    const input = await screen.findByPlaceholderText('Search a variant')
    await waitFor(() => expect(input).toHaveFocus())
    expect(await screen.findByText('Variants')).toBeVisible()
  })

  it('hides the controls when read-only', async () => {
    const {user} = renderInput({value: 'md', readOnly: true})

    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: 'Replace variant'})).not.toBeInTheDocument()
    expect(screen.queryByRole('button', {name: /Medium/})).not.toBeInTheDocument()

    await user.click(screen.getByText('Medium'))
    expectListClosed()
  })

  it('does not open the list when empty and read-only', async () => {
    const {user} = renderInput({readOnly: true})

    await user.click(screen.getByPlaceholderText('Search a variant'))

    expectListClosed()
  })

  it('shows a stored value missing from the list as its raw value', () => {
    renderInput({value: 'xl'})

    expect(screen.getByText('xl')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Replace variant'})).toBeInTheDocument()
  })
})
