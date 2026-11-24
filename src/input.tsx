import {CloseIcon} from '@sanity/icons/Close'
import {EditIcon} from '@sanity/icons/Edit'
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Stack,
  Text,
  TextInput,
  useClickOutsideEvent,
} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import {Tooltip} from '@sanity/ui/tooltip'
import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react'
import {SanityDefaultPreview, set, unset, type StringInputProps} from 'sanity'

import {filterItems, toItems, type VariantItem} from './list'
import {moveActive} from './navigation'
import {isRequiredType} from './required'

/**
 * Keep focus in the search input while clicking inside the popover (a row, the label, the
 * scrollbar). Otherwise the input's blur would close the popover before the click lands.
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
  listId,
  items,
  label,
  empty,
  selected,
  activeIndex,
  activeRing,
  optionId,
  onSelect,
  onHover,
}: {
  listId: string
  items: VariantItem[]
  label: string
  empty: string
  selected?: string
  /** The highlighted row (keyboard or hover), an index into `items`; `-1` for none. */
  activeIndex: number
  /** Ring the highlighted row too: the keyboard moved it, so the hover tint alone is too faint. */
  activeRing: boolean
  /** A row's DOM id, stable while the search filters the list. */
  optionId: (item: VariantItem) => string
  onSelect: (item: VariantItem) => void
  onHover: (index: number) => void
}) {
  const labelId = `${listId}-label`
  // The list is the popover's only scroll area: the label stays put, and when the viewport is
  // short the list shrinks to fit (rather than the card scrolling around a scrolling list).
  return (
    <Flex direction="column" gap={1} style={{minHeight: 0}}>
      <Box paddingX={2} paddingY={3} style={{flexShrink: 0}}>
        <Text size={1} weight="medium" id={labelId}>
          {label}
        </Text>
      </Box>
      {items.length > 0 ? (
        <Stack
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          gap={1}
          style={{flex: 1, minHeight: 0, maxHeight: 390, overflowY: 'auto'}}
        >
          {items.map((item, index) => (
            <Button
              // Lists may repeat a value; the index keeps keys unique.
              key={item._key ?? `${item.value}-${index}`}
              id={optionId(item)}
              role="option"
              aria-selected={item.value === selected}
              // Focus stays in the search input (aria-activedescendant points at the row).
              tabIndex={-1}
              // The highlighted row gets the native hover color.
              data-hovered={index === activeIndex ? '' : undefined}
              style={
                activeRing && index === activeIndex
                  ? {boxShadow: 'inset 0 0 0 1px var(--card-focus-ring-color)'}
                  : undefined
              }
              mode="bleed"
              width="fill"
              padding={1}
              selected={item.value === selected}
              onMouseDown={keepInputFocus}
              onMouseMove={() => {
                if (index !== activeIndex) onHover(index)
              }}
              onClick={() => onSelect(item)}
            >
              <ItemPreview item={item} />
            </Button>
          ))}
        </Stack>
      ) : (
        <Box paddingX={2} paddingBottom={3}>
          <Text size={1} muted role="status">
            {empty}
          </Text>
        </Box>
      )}
    </Flex>
  )
}

/** A small bleed icon button in the picked row, with a tooltip. */
function RowAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ComponentType
  onClick: () => void
}) {
  return (
    <Tooltip
      animate
      portal
      placement="top"
      content={
        <Text size={1} weight="medium">
          {label}
        </Text>
      }
    >
      <Button
        aria-label={label}
        icon={icon}
        mode="bleed"
        style={{clipPath: 'inset(3px round 2px)'}}
        onClick={onClick}
      />
    </Tooltip>
  )
}

/** Flags a stored value that isn't one of the field's options (a typo, or a removed option). */
function MissingBadge() {
  return (
    <Tooltip
      animate
      portal
      placement="top"
      content={
        <Box style={{maxWidth: 240}}>
          <Text size={1}>This value isn’t one of the field’s options.</Text>
        </Box>
      }
    >
      <Box paddingX={1} style={{flexShrink: 0}}>
        <Badge tone="caution" fontSize={0}>
          Not in list
        </Badge>
      </Box>
    </Tooltip>
  )
}

/**
 * The picked item, shown like the color select's preset row: the preview is a bleed button with
 * the native hover that opens the search (the value stays until another is picked), the pencil
 * does the same, and the × (on fields that aren't required) clears it.
 */
function SelectedItem({
  item,
  missing,
  readOnly,
  invalid,
  clearable,
  fieldId,
  focusRef,
  onFieldFocus,
  onFieldBlur,
  onOpen,
  onTypeAhead,
  onClear,
}: {
  item: Pick<VariantItem, 'title' | 'icon'>
  /** The stored value isn't in `options.list`. */
  missing?: boolean
  readOnly?: boolean
  /** A validation error: the row takes the critical tone, like a native input. */
  invalid?: boolean
  clearable?: boolean
  /**
   * Sanity's focus wiring, on the preview button (the row's main control), so the label,
   * jumping to the field from a validation message and presence all work.
   */
  fieldId?: string
  focusRef?: React.Ref<HTMLButtonElement>
  onFieldFocus?: React.FocusEventHandler<HTMLButtonElement>
  onFieldBlur?: React.FocusEventHandler<HTMLButtonElement>
  onOpen: () => void
  /** A printable key on the row: open the search with it typed. */
  onTypeAhead: (text: string) => void
  onClear: () => void
}) {
  let tone: 'critical' | 'caution' | undefined
  if (invalid) tone = 'critical'
  else if (missing) tone = 'caution'
  return (
    <Card border radius={2} overflow="hidden" tone={tone}>
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
              aria-haspopup="listbox"
              aria-expanded={false}
              // Exactly the row's height, like the color select: padding would overflow the row
              // and push the clipped hover out to the border.
              padding={0}
              width="fill"
              style={{clipPath: 'inset(3px round 2px)'}}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onClick={onOpen}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  onOpen()
                } else if (
                  event.key.length === 1 &&
                  event.key !== ' ' &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.altKey
                ) {
                  event.preventDefault()
                  onTypeAhead(event.key)
                }
              }}
            >
              <ItemPreview item={item} />
            </Button>
          )}
        </Box>
        {missing && <MissingBadge />}
        {!readOnly && <RowAction label="Replace variant" icon={EditIcon} onClick={onOpen} />}
        {!readOnly && clearable && <RowAction label="Clear" icon={CloseIcon} onClick={onClear} />}
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

const contains = (element: Element | null, target: EventTarget | null) =>
  Boolean(element && target instanceof Node && element.contains(target))

/**
 * A string input, like the color select: with no value, a search input (a combobox) with a
 * popover listing the field's `options.list`; with a value, the picked item, which opens the same
 * search. The value only changes when another item is picked, or the × clears it.
 */
export function VariantPickerInput(props: StringInputProps) {
  const {value, onChange, readOnly, elementProps, schemaType, validationError, validation} = props
  const invalid = validation.some((marker) => marker.level === 'error')
  const required = useMemo(() => isRequiredType(schemaType), [schemaType])
  // Sanity drops a field-level `placeholder` on types that extend `string` (only `options` and a
  // few other keys carry over), so `options.placeholder` is the way to set one per field.
  const placeholder =
    (schemaType.options as {placeholder?: string} | undefined)?.placeholder ||
    (schemaType as {placeholder?: string}).placeholder ||
    'Search a variant'
  const items = useMemo(() => toItems(schemaType.options?.list), [schemaType.options?.list])
  const selectedItem = value ? items.find((item) => item.value === value) : undefined
  // A stored value missing from the list still shows, as its raw value, flagged.
  const selected = value ? (selectedItem ?? {title: value, icon: undefined}) : null

  const listId = `${useId()}-listbox`
  const optionId = (item: VariantItem) => `${listId}-option-${items.indexOf(item)}`

  const [open, setOpen] = useState(false)
  const expanded = open && !readOnly
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const rowRef = useRef<HTMLButtonElement | null>(null)
  // Text typed in the field: a search over the list.
  const [query, setQuery] = useState('')
  const matches = useMemo(() => filterItems(items, query), [items, query])
  // The highlighted row, an index into `matches`.
  const [active, setActive] = useState(-1)
  // Scroll the highlighted row into view only when the keyboard moved it, not the mouse.
  const scrollToActive = useRef(false)
  // Whether the keyboard (or typing) last moved the highlight, rather than the mouse.
  const [keyboardActive, setKeyboardActive] = useState(false)
  // Which control to focus once it renders: the search after opening it from the picked row,
  // the picked row after a pick or Escape, the empty search after clearing.
  const pendingFocus = useRef<'input' | 'row' | null>(null)
  // Focusing the empty search opens the list, except when the × moved focus there.
  const suppressOpen = useRef(false)

  const showRow = Boolean(selected) && !expanded

  useEffect(() => {
    const target = pendingFocus.current === 'row' ? rowRef.current : inputRef.current
    if (pendingFocus.current && target) {
      pendingFocus.current = null
      target.focus()
    }
  }, [showRow, value])

  const activeItem = expanded ? matches[active] : undefined
  const activeId = activeItem ? optionId(activeItem) : undefined
  useEffect(() => {
    if (!scrollToActive.current || !activeId) return
    scrollToActive.current = false
    document.getElementById(activeId)?.scrollIntoView({block: 'nearest'})
  }, [activeId])

  /** Opens the list, highlighting the picked item (or nothing). */
  const openList = (nextQuery = '') => {
    if (readOnly) return
    const list = filterItems(items, nextQuery)
    setQuery(nextQuery)
    setActive(nextQuery.trim() ? 0 : list.findIndex((item) => item.value === value))
    scrollToActive.current = true
    setKeyboardActive(true)
    setOpen(true)
  }

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(-1)
  }, [])

  useClickOutsideEvent(expanded && close, () => [container, popoverRef.current])

  const select = (item: VariantItem) => {
    if (item.value !== value) onChange(set(item.value))
    pendingFocus.current = 'row'
    close()
  }

  // From the picked row (click, Enter/Space, arrows, the pencil): swap in the search.
  const openFromRow = (text = '') => {
    pendingFocus.current = 'input'
    openList(text)
  }

  const clear = () => {
    onChange(unset())
    suppressOpen.current = true
    pendingFocus.current = 'input'
    close()
  }

  const move = (delta: number) => {
    scrollToActive.current = true
    setKeyboardActive(true)
    setActive((index) => moveActive(index, matches.length, delta))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        const delta = event.key === 'ArrowDown' ? 1 : -1
        if (expanded) move(delta)
        else openList(query)
        break
      }
      case 'Enter': {
        event.preventDefault()
        if (!expanded) openList(query)
        else if (activeItem) select(activeItem)
        // Enter picks the first match of a search.
        else if (query.trim() && matches[0]) select(matches[0])
        break
      }
      case 'Escape': {
        if (!expanded && !query) return
        // Don't let a surrounding dialog close too.
        event.preventDefault()
        event.stopPropagation()
        if (value) pendingFocus.current = 'row'
        close()
        break
      }
      default:
    }
  }

  let label = 'Variants'
  if (query.trim()) label = `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`
  const empty = query.trim() ? `No variants match “${query.trim()}”` : 'No variants'

  const fieldRef = elementProps.ref as React.Ref<HTMLElement> | undefined

  return (
    <>
      <Popover
        open={expanded}
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
            display="flex"
            style={{
              width: 340,
              maxHeight: 'inherit',
              minHeight: 0,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onMouseDown={keepInputFocus}
          >
            <ItemList
              listId={listId}
              items={matches}
              label={label}
              empty={empty}
              selected={value}
              activeIndex={active}
              activeRing={keyboardActive}
              optionId={optionId}
              onSelect={select}
              onHover={(index) => {
                scrollToActive.current = false
                setKeyboardActive(false)
                setActive(index)
              }}
            />
          </Card>
        }
      />
      <Box ref={setContainer}>
        {selected && showRow ? (
          <SelectedItem
            item={selected}
            missing={!selectedItem}
            readOnly={readOnly}
            invalid={invalid}
            clearable={!required}
            fieldId={elementProps.id}
            focusRef={(node) => assignRefs<HTMLElement>(node, rowRef as never, fieldRef)}
            onFieldFocus={
              elementProps.onFocus as unknown as React.FocusEventHandler<HTMLButtonElement>
            }
            onFieldBlur={
              elementProps.onBlur as unknown as React.FocusEventHandler<HTMLButtonElement>
            }
            onOpen={() => openFromRow()}
            onTypeAhead={openFromRow}
            onClear={clear}
          />
        ) : (
          <TextInput
            {...elementProps}
            ref={(node) => assignRefs<HTMLElement>(node, inputRef as never, fieldRef)}
            role={readOnly ? undefined : 'combobox'}
            aria-autocomplete={readOnly ? undefined : 'list'}
            aria-haspopup={readOnly ? undefined : 'listbox'}
            aria-expanded={readOnly ? undefined : expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={activeId}
            autoComplete="off"
            readOnly={readOnly}
            customValidity={validationError}
            // Read-only and empty: a neutral empty field, not an invitation to search. While
            // replacing a value, the current one stands in as the placeholder.
            placeholder={readOnly ? undefined : (selected?.title ?? placeholder)}
            fontSize={1}
            weight="medium"
            value={query}
            style={{height: 35}}
            onFocus={(event) => {
              elementProps.onFocus(event)
              if (suppressOpen.current) suppressOpen.current = false
              else if (!expanded) openList(query)
            }}
            onClick={() => {
              if (!expanded) openList(query)
            }}
            onChange={(event) => {
              const next = event.currentTarget.value
              setQuery(next)
              setActive(
                next.trim() ? 0 : filterItems(items, next).findIndex((i) => i.value === value),
              )
              scrollToActive.current = true
              setKeyboardActive(true)
              setOpen(true)
            }}
            onBlur={(event) => {
              elementProps.onBlur(event)
              // Tabbing (or clicking) away closes the list; the value stays as it was.
              if (
                contains(container, event.relatedTarget) ||
                contains(popoverRef.current, event.relatedTarget)
              ) {
                return
              }
              close()
            }}
            onKeyDown={handleKeyDown}
          />
        )}
      </Box>
    </>
  )
}
