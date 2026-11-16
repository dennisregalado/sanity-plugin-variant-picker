import {EditIcon} from '@sanity/icons/Edit'
import {Box, Button, Card, Flex, Stack, Text, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import {Tooltip} from '@sanity/ui/tooltip'
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {SanityDefaultPreview, set, unset, type StringInputProps} from 'sanity'

import {filterItems, toItems, type VariantItem} from './list'

/**
 * Keep focus in the field while clicking inside the popover. Otherwise the field's blur clears
 * the search and swaps the popover content before the click lands.
 */
const keepInputFocus = (event: React.MouseEvent) => event.preventDefault()

/** An item's title with its icon on the left, as a native compact preview. */
function ItemPreview({item}: {item: Pick<VariantItem, 'title' | 'icon'>}) {
  // `icon={false}` hides all media, so it only stands in for a missing icon.
  return item.icon ? (
    <SanityDefaultPreview layout="compact" title={item.title} media={item.icon} />
  ) : (
    <SanityDefaultPreview layout="compact" title={item.title} icon={false} />
  )
}

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
          {items.map((item, index) => (
            <Button
              // Lists may repeat a value; the index keeps keys unique.
              key={item._key ?? `${item.value}-${index}`}
              mode="bleed"
              width="fill"
              padding={1}
              selected={item.value === selected}
              onMouseDown={keepInputFocus}
              onClick={() => onSelect(item)}
            >
              <ItemPreview item={item} />
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

/**
 * The picked item, shown like the color select's preset row: the preview is a bleed button with
 * the native hover that opens the list (the value stays until another is picked), and the pencil
 * on the right clears it and reopens the search.
 */
function SelectedItem({
  item,
  readOnly,
  invalid,
  fieldId,
  focusRef,
  onFieldFocus,
  onFieldBlur,
  onOpen,
  onEscape,
  onReplace,
}: {
  item: Pick<VariantItem, 'title' | 'icon'>
  readOnly?: boolean
  /** A validation error: the row takes the critical tone, like a native input. */
  invalid?: boolean
  /**
   * Sanity's focus wiring, on the preview button (the row's main control), so the label,
   * jumping to the field from a validation message and presence all work.
   */
  fieldId?: string
  focusRef?: React.Ref<HTMLButtonElement>
  onFieldFocus?: React.FocusEventHandler<HTMLButtonElement>
  onFieldBlur?: React.FocusEventHandler<HTMLButtonElement>
  onOpen: () => void
  onEscape: () => void
  onReplace: () => void
}) {
  return (
    <Card border radius={2} overflow="hidden" tone={invalid ? 'critical' : undefined}>
      <Flex align="center" style={{height: 33}}>
        <Box flex={1} style={{minWidth: 0}}>
          {readOnly ? (
            <Box paddingX={1}>
              <ItemPreview item={item} />
            </Box>
          ) : (
            <Button
              id={fieldId}
              ref={focusRef}
              mode="bleed"
              // Exactly the row's height, like the color select: padding would overflow the row
              // and push the clipped hover out to the border.
              padding={0}
              width="fill"
              style={{clipPath: 'inset(3px round 2px)'}}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onClick={onOpen}
              onKeyDown={(event) => {
                if (event.key === 'Escape') onEscape()
              }}
            >
              <ItemPreview item={item} />
            </Button>
          )}
        </Box>
        {!readOnly && (
          <Tooltip
            animate
            portal
            placement="top"
            content={
              <Text size={1} weight="medium">
                Replace variant
              </Text>
            }
          >
            <Button
              aria-label="Replace variant"
              icon={EditIcon}
              mode="bleed"
              style={{clipPath: 'inset(3px round 2px)'}}
              onClick={onReplace}
            />
          </Tooltip>
        )}
      </Flex>
    </Card>
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
 * A string input, like the color select: with no value, an input with a popover listing the
 * field's `options.list` (typing searches it); with a value, the picked item, which opens the
 * same list, and a pencil that clears it and reopens the search.
 */
export function VariantPickerInput(props: StringInputProps) {
  const {value, onChange, readOnly, elementProps, schemaType, validationError, validation} = props
  const invalid = validation.some((marker) => marker.level === 'error')
  // Sanity drops a field-level `placeholder` on types that extend `string` (only `options` and a
  // few other keys carry over), so `options.placeholder` is the way to set one per field.
  const placeholder =
    (schemaType.options as {placeholder?: string} | undefined)?.placeholder ||
    (schemaType as {placeholder?: string}).placeholder ||
    'Search a variant'
  const items = useMemo(() => toItems(schemaType.options?.list), [schemaType.options?.list])
  // A stored value missing from the list still shows, as its raw value.
  const selected = value
    ? (items.find((item) => item.value === value) ?? {title: value, icon: undefined})
    : null

  const [open, setOpen] = useState(false)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Set by the pencil: focus the input once it's rendered (after the value is cleared).
  const focusPending = useRef(false)
  // Text typed in the field: a search over the list.
  const [typed, setTyped] = useState<string | null>(null)
  const query = typed ?? ''
  const matches = useMemo(() => filterItems(items, query), [items, query])

  useEffect(() => {
    if (focusPending.current && inputRef.current) {
      focusPending.current = false
      inputRef.current.focus()
    }
  })

  const close = useCallback(() => {
    setOpen(false)
    setTyped(null)
  }, [])

  useClickOutsideEvent(open && close, () => [container, popoverRef.current])

  const select = (item: VariantItem) => {
    if (item.value !== value) onChange(set(item.value))
    close()
  }

  // Pencil: clear the value and reopen the popover to pick anew.
  const replace = () => {
    setTyped(null)
    onChange(unset())
    setOpen(true)
    focusPending.current = true
  }

  // Leaving the field drops the search.
  const commitTyped = () => setTyped(null)

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
        {selected ? (
          <SelectedItem
            item={selected}
            readOnly={readOnly}
            invalid={invalid}
            fieldId={elementProps.id}
            focusRef={elementProps.ref as unknown as React.Ref<HTMLButtonElement>}
            onFieldFocus={
              elementProps.onFocus as unknown as React.FocusEventHandler<HTMLButtonElement>
            }
            onFieldBlur={
              elementProps.onBlur as unknown as React.FocusEventHandler<HTMLButtonElement>
            }
            onOpen={() => setOpen((wasOpen) => !wasOpen)}
            onEscape={close}
            onReplace={replace}
          />
        ) : (
          <TextInput
            {...elementProps}
            ref={(node) =>
              assignRefs(
                node,
                inputRef,
                elementProps.ref as React.Ref<HTMLInputElement> | undefined,
              )
            }
            readOnly={readOnly}
            customValidity={validationError}
            placeholder={placeholder}
            fontSize={1}
            weight="medium"
            value={query}
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
              }
              if (event.key === 'Escape') close()
            }}
          />
        )}
      </Box>
    </>
  )
}
