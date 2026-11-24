/**
 * A minimal page for the README screenshots: the field with Studio's theme and a stand-in source
 * (the native preview reads a client from it), outside a full Studio.
 */
// Studio loads @sanity/ui's static styles; this page has to, before any styled-components.
import '@sanity/ui/styles.css'

import {createClient} from '@sanity/client'
import {CircleIcon} from '@sanity/icons/Circle'
import {SquareIcon} from '@sanity/icons/Square'
import {TriangleOutlineIcon} from '@sanity/icons/TriangleOutline'
import {Box, Card, Stack, studioTheme, Text, ThemeProvider} from '@sanity/ui'
import {useCallback, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {type FormPatch, type PatchEvent, type Source, type StringInputProps} from 'sanity'
import {SourceContext} from 'sanity/_singletons'

import {VariantPickerInput} from '../../src/input'

const client = createClient({projectId: 'demo', dataset: 'demo', apiVersion: '2025-02-07'})
const source = {getClient: () => client} as unknown as Source

const list = [
  {title: 'Circle', value: 'circle', icon: CircleIcon},
  {title: 'Square', value: 'square', icon: SquareIcon},
  {title: 'Triangle', value: 'triangle', icon: TriangleOutlineIcon},
  {title: 'Hexagon', value: 'hexagon', icon: '⬢'},
  {title: 'Star', value: 'star', icon: '★'},
]

const initial = new URLSearchParams(window.location.search).get('value') ?? undefined
const noop = () => undefined

function Field() {
  const [value, setValue] = useState<string | undefined>(initial)
  const onChange = useCallback((patch: FormPatch | FormPatch[] | PatchEvent) => {
    const p = patch as FormPatch
    setValue(p.type === 'set' ? (p.value as string) : undefined)
  }, [])
  const props = {
    value,
    onChange,
    validation: [],
    schemaType: {name: 'variantPicker', jsonType: 'string', options: {list}},
    elementProps: {id: 'shape', ref: {current: null}, onFocus: noop, onBlur: noop, value},
  } as unknown as StringInputProps

  return (
    <Stack gap={3}>
      <Text size={1} weight="medium">
        <label htmlFor="shape">Shape</label>
      </Text>
      <VariantPickerInput {...props} />
    </Stack>
  )
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={studioTheme}>
    <SourceContext.Provider value={source}>
      <Card padding={4} style={{width: 380, height: 390}}>
        <Box>
          <Field />
        </Box>
      </Card>
    </SourceContext.Provider>
  </ThemeProvider>,
)
