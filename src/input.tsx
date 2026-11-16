import {Box, Card, TextInput, useClickOutsideEvent} from '@sanity/ui'
import {Popover} from '@sanity/ui/popover'
import React, {useCallback, useMemo, useRef, useState} from 'react'
import {set, unset} from 'sanity'

import {formatColor, fromColorValue, parseColor, toColorValue, type ColorValue} from './color'
import {ColorSwatch} from './swatch'
import type {ColorPickerInputProps} from './types'

/** Points each ref (callback or object) at `node`. */
function assignRefs<T>(node: T | null, ...refs: Array<React.Ref<T> | undefined>) {
  for (const ref of refs) {
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<T | null>).current = node
  }
}

/** Same color, format and alpha: nothing to write. */
function sameValue(a: Partial<ColorValue> | null | undefined, b: ColorValue): boolean {
  return Boolean(a && a.css === b.css && a.hex === b.hex && a.alpha === b.alpha && a.hsv)
}

/**
 * `variantPicker` fields: one input with a popover, like the link picker. Typing or pasting a
 * color writes the resolved color to `value`. Nothing is written just by opening a document.
 */
export function ColorPickerInput(props: ColorPickerInputProps) {
  const {value, onChange, readOnly, elementProps, schemaType, defaults} = props
  const format = schemaType.options?.format ?? defaults.format
  const alpha = schemaType.options?.alpha ?? defaults.alpha

  const storedValue = value?.value
  const key = value?._key
  const keyed = useMemo(() => (key ? {_key: key} : {}), [key])
  const typeName = schemaType.name

  const stored = useMemo(() => fromColorValue(storedValue), [storedValue])
  const storedText = storedValue?.css ?? ''

  const [open, setOpen] = useState(false)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  // Text typed in the field: a color to apply on blur or Enter.
  const [typed, setTyped] = useState<string | null>(null)

  const typedColor = parseColor(typed)
  const shown = typedColor ?? stored
  const shownCss = shown ? formatColor(shown, 'rgb', alpha) : ''

  const close = useCallback(() => {
    setOpen(false)
    setTyped(null)
  }, [])

  useClickOutsideEvent(open && close, () => [container, popoverRef.current])

  const setColor = (next: ColorValue) => {
    if (sameValue(storedValue, next)) return
    onChange(set({...keyed, _type: typeName, value: next}))
  }

  const commitTyped = () => {
    if (typedColor) setColor(toColorValue(typedColor, format, alpha))
    else if (typed !== null && !typed.trim() && storedValue) onChange(unset())
    setTyped(null)
  }

  /** Paste replaces the color, wherever the caret is, and applies right away (no blur needed). */
  const pasteColor = (text: string): boolean => {
    const color = parseColor(text.trim())
    if (!color) return false
    setTyped(null)
    setColor(toColorValue(color, format, alpha))
    return true
  }

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
          />
        }
      />
      <Box ref={setContainer} style={{position: 'relative'}}>
        {shownCss && (
          <Box style={{position: 'absolute', top: 5, left: 5, zIndex: 1, pointerEvents: 'none'}}>
            <ColorSwatch color={shownCss} size={25} />
          </Box>
        )}
        <TextInput
          {...elementProps}
          ref={(node) =>
            assignRefs(node, elementProps.ref as React.Ref<HTMLInputElement> | undefined)
          }
          readOnly={readOnly}
          placeholder="Paste a color"
          fontSize={1}
          weight="medium"
          value={typed ?? storedText}
          style={{height: 35, ...(shownCss ? {paddingLeft: 38} : {})}}
          onFocus={(event) => {
            elementProps.onFocus(event)
            setOpen(true)
          }}
          onClick={() => setOpen(true)}
          onPaste={(event) => {
            if (pasteColor(event.clipboardData.getData('text'))) event.preventDefault()
          }}
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
              commitTyped()
            }
            if (event.key === 'Escape') close()
          }}
        />
      </Box>
    </>
  )
}
