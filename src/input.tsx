import {Box, Button, Card, Stack, Text, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import React, {useCallback, useMemo, useRef, useState} from 'react'
import {SanityDefaultPreview, set, unset, type StringInputProps} from 'sanity'

import {filterItems, toItems, type VariantItem} from './list'

/**
 * Keep focus in the field while clicking inside the popover. Otherwise the field's blur clears
 * the search and swaps the popover content before the click lands.
 */
const keepInputFocus = (event: React.MouseEvent) => event.preventDefault()

function ItemList({
  items,
  label,
  empty,
  selected,
  onSelect,
}: {
  items: VariantItem[]
  label: string
  empty: string
  selected?: string
  onSelect: (item: VariantItem) => void
}) {
  return (
    <Stack gap={1}>
      <Box paddingX={2} paddingY={3}>
        <Text size={1} weight="medium">
          {label}
        </Text>
      </Box>
      {items.length > 0 ? (
        <Stack gap={1} style={{maxHeight: 390, overflowY: 'auto'}}>
          {items.map((item) => (
            <Button
              key={item._key ?? item.value}
              mode="bleed"
              width="fill"
              padding={1}
              selected={item.value === selected}
              onMouseDown={keepInputFocus}
              onClick={() => onSelect(item)}
            >
              <SanityDefaultPreview layout="compact" title={item.title} icon={false} />
            </Button>
          ))}
        </Stack>
      ) : (
        <Box paddingX={2} paddingBottom={3}>
          <Text size={1} muted>
            {empty}
          </Text>
        </Box>
      )}
    </Stack>
  )
}

/** Points each ref (callback or object) at `node`. */
function assignRefs<T>(node: T | null, ...refs: Array<React.Ref<T> | undefined>) {
  for (const ref of refs) {
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<T | null>).current = node
  }
}

/**
 * A string input, like the link picker: one input with a popover listing the field's
 * `options.list`. Typing searches the list; picking an item writes its `value`.
 */
export function VariantPickerInput(props: StringInputProps) {
  const {value, onChange, readOnly, elementProps, schemaType} = props
  const items = useMemo(() => toItems(schemaType.options?.list), [schemaType.options?.list])
  const selected = items.find((item) => item.value === value)

  const [open, setOpen] = useState(false)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  // Text typed in the field: a search over the list.
  const [typed, setTyped] = useState<string | null>(null)
  const query = typed ?? ''
  const matches = useMemo(() => filterItems(items, query), [items, query])

  const close = useCallback(() => {
    setOpen(false)
    setTyped(null)
  }, [])

  useClickOutsideEvent(open && close, () => [container, popoverRef.current])

  const select = (item: VariantItem) => {
    if (item.value !== value) onChange(set(item.value))
    close()
  }

  // Leaving the field: an emptied field clears the value; any other search is dropped.
  const commitTyped = () => {
    if (typed !== null && !typed.trim() && value) onChange(unset())
    setTyped(null)
  }

  let label = 'Variants'
  if (query.trim()) label = `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`
  const empty = query.trim() ? `No variants match “${query.trim()}”` : 'No variants'

  return (
    <>
      <Popover
        open={open && !readOnly}
        referenceElement={container}
        portal
        placement="bottom-start"
        fallbackPlacements={['top-start']}
        animate
        constrainSize
        radius={4}
        shadow={3}
        content={
          <Card
            ref={popoverRef}
            padding={1}
            radius={4}
            style={{width: 340, maxHeight: 'inherit', overflow: 'auto'}}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
            }}
          >
            <ItemList
              items={matches}
              label={label}
              empty={empty}
              selected={value}
              onSelect={select}
            />
          </Card>
        }
      />
      <Box ref={setContainer}>
        <TextInput
          {...elementProps}
          ref={(node) =>
            assignRefs(node, elementProps.ref as React.Ref<HTMLInputElement> | undefined)
          }
          readOnly={readOnly}
          placeholder={elementProps.placeholder || 'Search a variant'}
          fontSize={1}
          weight="medium"
          value={typed ?? selected?.title ?? value ?? ''}
          style={{height: 35}}
          onFocus={(event) => {
            elementProps.onFocus(event)
            setOpen(true)
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setTyped(event.currentTarget.value)
            setOpen(true)
          }}
          onBlur={(event) => {
            elementProps.onBlur(event)
            commitTyped()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              // Enter picks the first match of a search.
              if (query.trim() && matches[0]) select(matches[0])
              else commitTyped()
            }
            if (event.key === 'Escape') close()
          }}
        />
      </Box>
    </>
  )
}
