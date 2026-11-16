import {BookmarkIcon} from '@sanity/icons/Bookmark'
import {EditIcon} from '@sanity/icons/Edit'
import {Box, Button, Card, Flex, Stack, Text, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import {Tooltip} from '@sanity/ui/tooltip'
import React, {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {
  SanityDefaultPreview,
  SearchResultItemPreview,
  set,
  unset,
  useEditState,
  usePerspective,
  useSchema,
  type ObjectInputProps,
  type Path,
} from 'sanity'
import {usePaneRouter} from 'sanity/structure'

import {
  formatColor,
  fromColorValue,
  parseColor,
  sameColor,
  storedCss,
  toColorValue,
  toHex,
  type ColorFormat,
  type ColorValue,
  type Hsva,
  type StoredColor,
} from './color'
import {ColorPicker} from './picker'
import {PresetResults, PresetList, ColorSwatch, usePresets} from './presets'
import type {ColorOptions, ColorPickerInputProps, ColorPreset} from './types'

/** Points each ref (callback or object) at `node`. */
function assignRefs<T>(node: T | null, ...refs: Array<React.Ref<T> | undefined>) {
  for (const ref of refs) {
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<T | null>).current = node
  }
}

/** A bleed icon button sized like Sanity UI's TextInput clear button. */
function FieldAction({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ElementType
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
        padding={2}
        // Keep focus in the input, like the built-in clear button.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      />
    </Tooltip>
  )
}

/** Live color of the referenced preset (draft first, then published). */
function useReferencedPreset(id: string | undefined, type: string) {
  const state = useEditState(id ?? '', type)
  if (!id) return null
  const doc = (state.draft ?? state.published) as {color?: StoredColor} | null
  return doc?.color ?? null
}

/** Preset reference, shown like a native reference input (and the link picker's). */
function PresetReference({
  documentId,
  documentType,
  path,
  onReplace,
}: {
  documentId: string
  documentType: string
  path: Path
  onReplace: () => void
}) {
  const schemaType = useSchema().get(documentType)
  const perspective = usePerspective()
  const {ReferenceChildLink} = usePaneRouter()

  const preview: ReactNode = schemaType ? (
    <SearchResultItemPreview
      documentId={documentId}
      documentType={documentType}
      layout="compact"
      perspective={perspective.perspectiveStack}
      schemaType={schemaType}
      showBadge={false}
    />
  ) : (
    <Box style={{width: '100%'}}>
      <SanityDefaultPreview isPlaceholder layout="compact" />
    </Box>
  )

  return (
    <Card border radius={2} overflow="hidden">
      <Flex align="center" style={{height: 33}}>
        <Box flex={1} style={{minWidth: 0}}>
          <ReferenceChildLink
            documentId={documentId}
            documentType={documentType}
            parentRefPath={path}
          >
            <Button
              as="span"
              mode="bleed"
              padding={0}
              width="fill"
              style={{clipPath: 'inset(3px round 2px)'}}
            >
              {preview}
            </Button>
          </ReferenceChildLink>
        </Box>
        <Tooltip
          animate
          portal
          placement="top"
          content={
            <Text size={1} weight="medium">
              Replace preset
            </Text>
          }
        >
          <Button
            aria-label="Replace preset"
            icon={EditIcon}
            mode="bleed"
            style={{clipPath: 'inset(3px round 2px)'}}
            onClick={onReplace}
          />
        </Tooltip>
      </Flex>
    </Card>
  )
}

/** Same color, format and alpha: nothing to write. */
function sameValue(a: Partial<ColorValue> | null | undefined, b: ColorValue): boolean {
  return Boolean(a && a.css === b.css && a.hex === b.hex && a.alpha === b.alpha && a.hsv)
}

type ColorFieldProps = {
  /** The stored color object (a field's `value`, or a preset's `color`). */
  colorValue: ColorValue | null | undefined
  /** Set when the color comes from a preset; shows the reference row. */
  referenceId?: string
  /** Live color of the referenced preset. */
  referencedColor?: StoredColor
  format: ColorFormat
  alpha: boolean
  pickerOnly: boolean
  paletteOnly: boolean
  presetType: string
  /** Only these preset IDs (a field's `options.presets`). */
  presetIds?: string[]
  /** Format new presets are saved in. */
  presetFormat: ColorFormat
  readOnly?: boolean
  elementProps: ObjectInputProps['elementProps']
  path: Path
  /** A manual color was picked, typed or pasted. */
  onValue: (value: ColorValue) => void
  /** A preset was picked (or just saved); `value` is its color in this field's format. */
  onPreset: (preset: ColorPreset, value: ColorValue | null) => void
  onClear: () => void
}

/**
 * The field UI, like the link picker: one input with a popover holding the picker and presets.
 * Shared by `variantPicker` fields and the preset document's `color`; each maps the callbacks onto
 * its own value shape.
 */
function ColorField(props: ColorFieldProps) {
  const {
    colorValue: storedValue,
    referenceId,
    referencedColor,
    format,
    alpha,
    pickerOnly,
    paletteOnly,
    presetType,
    presetIds,
    presetFormat,
    readOnly,
    elementProps,
    path,
    onValue,
    onPreset,
    onClear,
  } = props
  const {colors, refresh, client} = usePresets(presetType, !pickerOnly, presetIds)
  const hasValue = Boolean(storedValue || referenceId)

  const stored = useMemo(() => fromColorValue(storedValue), [storedValue])
  const storedText = storedValue?.css ?? ''

  const [open, setOpen] = useState(false)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Text typed in the field: a color to apply, or a search over preset.
  const [typed, setTyped] = useState<string | null>(null)
  // Live color while dragging in the picker, before it is committed.
  const [dragging, setDragging] = useState<Hsva | null>(null)
  // Inline "Name the color" mode: the name being typed and the preset it created.
  const [naming, setNaming] = useState<{name: string; color: Hsva} | null>(null)
  const namingRef = useRef(false)
  // Bumped by handlers that should move focus to the input once the next render is committed.
  const [focusRequest, setFocusRequest] = useState(0)

  const typedColor = paletteOnly ? null : parseColor(typed)
  const shown =
    naming?.color ??
    dragging ??
    typedColor ??
    (referenceId ? fromColorValue(referencedColor) : null) ??
    stored
  const shownCss = shown ? formatColor(shown, 'rgb', alpha) : ''
  const fieldText = typed ?? storedText
  const query = !pickerOnly && typed !== null && (paletteOnly || !typedColor) ? typed : ''

  useEffect(() => {
    if (focusRequest) inputRef.current?.focus()
  }, [focusRequest])

  const close = useCallback(() => {
    setOpen(false)
    setTyped(null)
    setDragging(null)
  }, [])

  useClickOutsideEvent(open && close, () => [container, popoverRef.current])

  const setManual = useCallback(
    (color: Hsva) => {
      if (paletteOnly) return
      const next = toColorValue(color, format, alpha)
      if (!referenceId && sameValue(storedValue, next)) return
      onValue(next)
    },
    [alpha, format, onValue, paletteOnly, referenceId, storedValue],
  )

  const setPreset = useCallback(
    (preset: ColorPreset) => {
      const color = fromColorValue(preset.color)
      onPreset(preset, color ? toColorValue(color, format, alpha) : null)
      close()
    },
    [alpha, close, format, onPreset],
  )

  const commitTyped = () => {
    if (typedColor) setManual(typedColor)
    else if (typed !== null && !typed.trim() && hasValue) onClear()
    setTyped(null)
  }

  // Pencil: clear the value (or reference) and reopen the popover to pick anew.
  const edit = () => {
    setTyped(null)
    setDragging(null)
    if (hasValue) onClear()
    setOpen(true)
    setFocusRequest((n) => n + 1)
  }

  // The preset created by the save button; naming mode only renames it.
  const createdRef = useRef<Promise<string> | null>(null)

  // Save: create the preset right away, titled with its hex, and reference it. The field
  // then switches to "Name the color"; blur or Enter renames it, empty keeps the hex title.
  const startNaming = () => {
    if (!shown) return
    const hex = toHex(shown, alpha)
    const color = toColorValue(shown, presetFormat, alpha)
    namingRef.current = true
    setNaming({name: '', color: shown})
    close()
    setFocusRequest((n) => n + 1)
    createdRef.current = client.create({_type: presetType, title: hex, color}).then((created) => {
      refresh()
      setPreset({_id: created._id, title: hex, color})
      return created._id
    })
  }

  const stopNaming = () => {
    namingRef.current = false
    setNaming(null)
  }

  const commitNaming = async () => {
    if (!naming) return
    const title = naming.name.trim()
    const created = createdRef.current
    stopNaming()
    createdRef.current = null
    if (!title || !created) return
    const id = await created
    await client.patch(id).set({title}).commit()
    refresh()
  }

  const storedHex = stored ? toHex(stored, alpha) : null
  const alreadyPreset = colors?.some((c) => sameColor(storedCss(c.color), storedHex))
  const canSave =
    !presetIds &&
    !pickerOnly &&
    !paletteOnly &&
    !referenceId &&
    typed === null &&
    Boolean(stored) &&
    !alreadyPreset
  const actionCount = naming || readOnly ? 0 : Number(canSave)

  let placeholder = 'Search or paste a color'
  if (pickerOnly) placeholder = 'Paste a color'
  if (paletteOnly) placeholder = 'Search color presets'
  if (naming) placeholder = 'Name the preset'

  const popover = (
    <Popover
      open={open && !readOnly && !naming}
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
          {query ? (
            <PresetResults colors={colors} query={query} onSelect={setPreset} />
          ) : (
            <Stack gap={1}>
              {!paletteOnly && (
                <Box padding={2}>
                  <ColorPicker
                    value={shown}
                    alpha={alpha}
                    format={format}
                    onChange={setDragging}
                    onCommit={(color) => {
                      setDragging(null)
                      setTyped(null)
                      setManual(color)
                    }}
                  />
                </Box>
              )}
              {!pickerOnly && (
                <PresetList colors={colors} selectedId={referenceId} onSelect={setPreset} />
              )}
            </Stack>
          )}
        </Card>
      }
    />
  )

  /**
   * Paste replaces the color, wherever the caret is, and applies right away (no blur needed).
   * Palette-only fields search presets for it instead. Returns whether it was handled.
   */
  const pasteColor = (text: string): boolean => {
    const trimmed = text.trim()
    const color = parseColor(trimmed)
    if (!color) return false
    if (paletteOnly) {
      setTyped(trimmed)
      setOpen(true)
      return true
    }
    setDragging(null)
    setTyped(null)
    setManual(color)
    return true
  }

  if (referenceId && !naming) {
    return (
      <>
        {popover}
        <Box
          ref={setContainer}
          onPaste={(event: React.ClipboardEvent) => {
            if (pasteColor(event.clipboardData.getData('text'))) event.preventDefault()
          }}
        >
          <PresetReference
            documentId={referenceId}
            documentType={presetType}
            path={path}
            onReplace={edit}
          />
        </Box>
      </>
    )
  }

  return (
    <>
      {popover}
      <Box ref={setContainer} style={{position: 'relative'}}>
        {shownCss && (
          // Same swatch, size and inset as the preset reference row's preview media.
          <Box style={{position: 'absolute', top: 5, left: 5, zIndex: 1, pointerEvents: 'none'}}>
            <ColorSwatch color={shownCss} size={25} />
          </Box>
        )}
        <TextInput
          {...elementProps}
          ref={(node) =>
            assignRefs(node, inputRef, elementProps.ref as React.Ref<HTMLInputElement> | undefined)
          }
          readOnly={readOnly}
          placeholder={placeholder}
          fontSize={1}
          weight="medium"
          value={naming ? naming.name : fieldText}
          style={{
            // Same height as the reference row; text starts where its preview title does.
            height: 35,
            ...(shownCss ? {paddingLeft: 38} : {}),
            ...(actionCount ? {paddingRight: `calc(${actionCount} * 33px + 8px)`} : {}),
          }}
          onFocus={(event) => {
            elementProps.onFocus(event)
            if (!namingRef.current) setOpen(true)
          }}
          onClick={() => {
            if (!namingRef.current) setOpen(true)
          }}
          onPaste={(event) => {
            if (naming) return
            if (pasteColor(event.clipboardData.getData('text'))) event.preventDefault()
          }}
          onChange={(event) => {
            const next = event.currentTarget.value
            if (naming) {
              setNaming({...naming, name: next})
              return
            }
            setTyped(next)
            setOpen(true)
          }}
          onBlur={(event) => {
            elementProps.onBlur(event)
            if (naming) commitNaming()
            else commitTyped()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (naming) commitNaming()
              else commitTyped()
            }
            if (event.key === 'Escape') {
              if (naming) stopNaming()
              else close()
            }
          }}
        />
        {actionCount > 0 && (
          <Flex
            align="center"
            gap={1}
            padding={1}
            style={{position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 2}}
          >
            {canSave && (
              <FieldAction label="Save as preset" icon={BookmarkIcon} onClick={startNaming} />
            )}
          </Flex>
        )}
      </Box>
    </>
  )
}

/**
 * `variantPicker` fields: every change writes the resolved color to `value`; a preset also stores
 * a weak `reference`, with `value` as a snapshot of its color taken when it was picked. Nothing is
 * written just by opening a document.
 */
export function ColorPickerInput(props: ColorPickerInputProps) {
  const {value, onChange, readOnly, presetType, elementProps, path, schemaType, defaults} = props
  const format = schemaType.options?.format ?? defaults.format
  const alpha = schemaType.options?.alpha ?? defaults.alpha
  const pickerOnly = schemaType.options?.pickerOnly ?? defaults.pickerOnly
  const paletteOnly = !pickerOnly && (schemaType.options?.paletteOnly ?? defaults.paletteOnly)

  const referenceId = value?.reference?._ref
  const referencedColor = useReferencedPreset(referenceId, presetType)
  const storedValue = value?.value
  const key = value?._key
  const keyed = useMemo(() => (key ? {_key: key} : {}), [key])
  const typeName = schemaType.name

  const onValue = useCallback(
    (next: ColorValue) => onChange(set({...keyed, _type: typeName, value: next})),
    [keyed, onChange, typeName],
  )
  const onPreset = useCallback(
    (preset: ColorPreset, next: ColorValue | null) =>
      onChange(
        set({
          ...keyed,
          _type: typeName,
          ...(next ? {value: next} : {}),
          reference: {_type: 'reference', _ref: preset._id, _weak: true},
        }),
      ),
    [keyed, onChange, typeName],
  )
  const onClear = useCallback(() => onChange(unset()), [onChange])

  return (
    <ColorField
      colorValue={storedValue}
      referenceId={referenceId}
      referencedColor={referencedColor}
      format={format}
      alpha={alpha}
      pickerOnly={pickerOnly}
      paletteOnly={paletteOnly}
      presetType={presetType}
      presetIds={schemaType.options?.presets}
      presetFormat={defaults.format}
      readOnly={readOnly}
      elementProps={elementProps}
      path={path}
      onValue={onValue}
      onPreset={onPreset}
      onClear={onClear}
    />
  )
}

const noop = () => undefined

/** The preset document's `color`: the same field, picker only, writing the value object itself. */
export function PresetColorInput(
  props: ObjectInputProps<ColorValue> & {presetType: string; defaults: Required<ColorOptions>},
) {
  const {value, onChange, readOnly, elementProps, path, presetType, defaults} = props
  const onValue = useCallback((next: ColorValue) => onChange(set(next)), [onChange])
  const onClear = useCallback(() => onChange(unset()), [onChange])

  return (
    <ColorField
      colorValue={value}
      format={defaults.format}
      alpha={defaults.alpha}
      pickerOnly
      paletteOnly={false}
      presetType={presetType}
      presetFormat={defaults.format}
      readOnly={readOnly}
      elementProps={elementProps}
      path={path}
      onValue={onValue}
      onPreset={noop}
      onClear={onClear}
    />
  )
}
