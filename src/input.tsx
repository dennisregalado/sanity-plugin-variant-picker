import {EditIcon} from '@sanity/icons/Edit'
import {Box, Button, Card, Flex, Stack, Text, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import {Tooltip} from '@sanity/ui/tooltip'
import React, {useEffect, useMemo, useRef, useState} from 'react'
import {SanityDefaultPreview, set, unset, type StringInputProps} from 'sanity'

import {fieldLabels, formatLabel, usePluginLabels} from './labels'
import {filterItems, toItems, type VariantItem} from './list'
import {scrollSelectedIntoView} from './scroll'

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
  open,
  onSelect,
}: {
  items: VariantItem[]
  label: string
  empty: string
  selected?: string
  /** The popover is showing: the picked item is scrolled into view each time it opens. */
  open?: boolean
  onSelect: (item: VariantItem) => void
}) {
  const listRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return undefined
    // After the popover has sized itself (its max height comes in a layout pass).
    const frame = requestAnimationFrame(() => scrollSelectedIntoView(listRef.current))
    return () => cancelAnimationFrame(frame)
  }, [open])
  // The list is the popover's only scroll area: the label stays put, and when the viewport is
  // short the list shrinks to fit (rather than the card scrolling around a scrolling list).
  return (
    <Flex direction="column" gap={1} style={{minHeight: 0}}>
      <Box paddingX={2} paddingY={3} style={{flexShrink: 0}}>
        <Text size={1} weight="medium">
          {label}
        </Text>
      </Box>
      {items.length > 0 ? (
        <Stack
          ref={listRef}
          gap={1}
          style={{flex: 1, minHeight: 0, maxHeight: 390, overflowY: 'auto'}}
        >
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
    </Flex>
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
  replaceLabel,
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
  /** The pencil's tooltip and accessible name. */
  replaceLabel: string
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
                {replaceLabel}
              </Text>
            }
          >
            <Button
              aria-label={replaceLabel}
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
  // Field `options.labels` / `options.placeholder`, then `variantPicker({labels})`, then defaults.
  const pluginLabels = usePluginLabels()
  const labels = fieldLabels(schemaType, pluginLabels)
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

  const close = () => {
    setOpen(false)
    setTyped(null)
  }

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

  const trimmed = query.trim()
  const label = trimmed ? formatLabel(labels.results, 'count', matches.length) : labels.listTitle
  const empty = trimmed ? formatLabel(labels.noMatches, 'query', trimmed) : labels.empty

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
        // As wide as the field, but never narrower than a comfortable list (nor than the viewport).
        matchReferenceWidth
        radius={4}
        shadow={3}
        content={
          <Card
            ref={popoverRef}
            padding={1}
            radius={4}
            display="flex"
            style={{
              minWidth: 'min(280px, calc(100vw - 16px))',
              maxHeight: 'inherit',
              minHeight: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
            }}
          >
            <ItemList
              items={matches}
              label={label}
              empty={empty}
              selected={value}
              open={open && !readOnly}
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
            replaceLabel={labels.replace}
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
            placeholder={labels.placeholder}
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
