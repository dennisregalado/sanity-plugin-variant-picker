/** Hue 0–360, saturation and value 0–1, alpha 0–1. */
export type Hsva = {h: number; s: number; v: number; a: number}
export type Rgba = {r: number; g: number; b: number; a: number}
export type Hsla = {h: number; s: number; l: number; a: number}
/** OKLCH: lightness 0–1, chroma 0–~0.4, hue 0–360, alpha 0–1. */
export type Oklcha = {l: number; c: number; h: number; a: number}

/** How a color is written: stored in `value`, shown in the picker's inputs and copied. */
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch'
export const COLOR_FORMATS: ColorFormat[] = ['hex', 'rgb', 'hsl', 'oklch']

export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n))
const round = (n: number, places = 0) => {
  const f = 10 ** places
  return Math.round(n * f) / f
}

// ---------------------------------------------------------------------------------------------
// Conversions

export function hsvaToRgba({h, s, v, a}: Hsva): Rgba {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
  }
  return {r: f(5), g: f(3), b: f(1), a}
}

export function rgbaToHsva({r, g, b, a}: Rgba): Hsva {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const d = max - Math.min(rr, gg, bb)
  let h = 0
  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6
    else if (max === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return {h, s: max ? d / max : 0, v: max, a}
}

export function hsvaToHsla({h, s, v, a}: Hsva): Hsla {
  const l = v * (1 - s / 2)
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l)
  return {h, s: sl, l, a}
}

export function hslaToHsva({h, s, l, a}: Hsla): Hsva {
  const v = l + s * Math.min(l, 1 - l)
  return {h, s: v === 0 ? 0 : 2 * (1 - l / v), v, a}
}

// OKLCH, via linear sRGB and OKLab (Björn Ottosson's matrices). Out-of-gamut colors are clipped.

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function hsvaToOklcha(color: Hsva): Oklcha {
  const f = (n: number) => {
    const k = (n + color.h / 60) % 6
    return color.v - color.v * color.s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  const [r, g, b] = [f(5), f(3), f(1)].map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.sqrt(A * A + B * B)
  // Greys have no hue; keep the picker's so dragging through grey doesn't snap to red.
  const h = c < 1e-4 ? color.h : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return {l: L, c, h, a: color.a}
}

export function oklchaToHsva({l: L, c, h, a}: Oklcha): Hsva {
  const rad = (h * Math.PI) / 180
  const A = c * Math.cos(rad)
  const B = c * Math.sin(rad)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((x) => Math.round(clamp(fromLinear(x)) * 255))
  const hsva = rgbaToHsva({r: rgb[0], g: rgb[1], b: rgb[2], a})
  return hsva.s === 0 ? {...hsva, h} : hsva
}

// ---------------------------------------------------------------------------------------------
// Parsing

const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const NUM = '([+-]?\\d*\\.?\\d+)(%?)'
const SEP = '\\s*[,\\s]\\s*'
const ALPHA = `(?:\\s*[,/]\\s*${NUM})?`
const RGB = new RegExp(`^rgba?\\(\\s*${NUM}${SEP}${NUM}${SEP}${NUM}${ALPHA}\\s*\\)$`, 'i')
const HSL = new RegExp(`^hsla?\\(\\s*${NUM}(?:deg)?${SEP}${NUM}${SEP}${NUM}${ALPHA}\\s*\\)$`, 'i')
const OKLCH = new RegExp(`^oklch\\(\\s*${NUM}\\s+${NUM}\\s+${NUM}(?:deg)?${ALPHA}\\s*\\)$`, 'i')

const alphaOf = (n?: string, pct?: string) =>
  n === undefined ? 1 : clamp(pct ? Number(n) / 100 : Number(n))

/** Parse hex (3, 4, 6 or 8 digits, `#` optional), `rgb()`, `hsl()` or `oklch()`. */
export function parseColor(input: string | null | undefined): Hsva | null {
  const text = input?.trim()
  if (!text) return null

  const hex = text.match(HEX)
  if (hex) {
    let digits = hex[1]
    if (digits.length <= 4) digits = digits.replace(/./g, (c) => c + c)
    const int = (i: number) => parseInt(digits.slice(i, i + 2), 16)
    return rgbaToHsva({
      r: int(0),
      g: int(2),
      b: int(4),
      a: digits.length === 8 ? round(int(6) / 255, 2) : 1,
    })
  }

  const rgb = text.match(RGB)
  if (rgb) {
    const ch = (n: string, pct: string) => clamp(pct ? (Number(n) / 100) * 255 : Number(n), 0, 255)
    return rgbaToHsva({
      r: Math.round(ch(rgb[1], rgb[2])),
      g: Math.round(ch(rgb[3], rgb[4])),
      b: Math.round(ch(rgb[5], rgb[6])),
      a: alphaOf(rgb[7], rgb[8]),
    })
  }

  const hsl = text.match(HSL)
  if (hsl) {
    return hslaToHsva({
      h: ((Number(hsl[1]) % 360) + 360) % 360,
      s: clamp(Number(hsl[3]) / 100),
      l: clamp(Number(hsl[5]) / 100),
      a: alphaOf(hsl[7], hsl[8]),
    })
  }

  const oklch = text.match(OKLCH)
  if (oklch) {
    return oklchaToHsva({
      l: clamp(oklch[2] ? Number(oklch[1]) / 100 : Number(oklch[1])),
      // In CSS, 100% chroma is 0.4.
      c: Math.max(0, oklch[4] ? (Number(oklch[3]) / 100) * 0.4 : Number(oklch[3])),
      h: ((Number(oklch[5]) % 360) + 360) % 360,
      a: alphaOf(oklch[7], oklch[8]),
    })
  }

  return null
}

// ---------------------------------------------------------------------------------------------
// Formatting

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0')

/** `#RRGGBB`, or `#RRGGBBAA` when `alpha` is on and the color isn't opaque. */
export function toHex(color: Hsva, alpha = false): string {
  const {r, g, b, a} = hsvaToRgba(color)
  const aa = alpha && a < 1 ? hex2(a * 255) : ''
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${aa}`.toUpperCase()
}

export function toRgb(color: Hsva, alpha = false): string {
  const {r, g, b, a} = hsvaToRgba(color)
  return alpha && a < 1 ? `rgb(${r} ${g} ${b} / ${round(a, 2)})` : `rgb(${r} ${g} ${b})`
}

export function toHsl(color: Hsva, alpha = false): string {
  const {h, s, l, a} = hsvaToHsla(color)
  const body = `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  return alpha && a < 1 ? `hsl(${body} / ${round(a, 2)})` : `hsl(${body})`
}

export function toOklch(color: Hsva, alpha = false): string {
  const {l, c, h, a} = hsvaToOklcha(color)
  const body = `${round(l * 100, 1)}% ${round(c, 3)} ${round(h, 1)}`
  return alpha && a < 1 ? `oklch(${body} / ${round(a, 2)})` : `oklch(${body})`
}

/** Write a color in `format`. Alpha is dropped unless `alpha` is on. */
export function formatColor(color: Hsva, format: ColorFormat = 'hex', alpha = false): string {
  if (format === 'rgb') return toRgb(color, alpha)
  if (format === 'hsl') return toHsl(color, alpha)
  if (format === 'oklch') return toOklch(color, alpha)
  return toHex(color, alpha)
}

/** Parse and rewrite in `format`; `null` if it isn't a color. */
export function normalizeColor(
  input: string | null | undefined,
  format: ColorFormat = 'hex',
  alpha = false,
): string | null {
  const color = parseColor(input)
  return color ? formatColor(color, format, alpha) : null
}

/** Two colors are the same if they match as 8-digit hex. */
export function sameColor(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = parseColor(a)
  const cb = parseColor(b)
  return Boolean(ca && cb && toHex(ca, true) === toHex(cb, true))
}

/** CSS background: `layer` (any background image) over a transparency checkerboard. */
export function overCheckerboard(layer: string): string {
  return `${layer}, repeating-conic-gradient(#d0d0d0 0% 25%, #fff 0% 50%) 0 0 / 8px 8px`
}

/** CSS background that shows a translucent color over a checkerboard. */
export function checkerboard(color: string): string {
  return overCheckerboard(`linear-gradient(${color}, ${color})`)
}

// ---------------------------------------------------------------------------------------------
// Stored value

/** The color object the input writes to `value`, so GROQ can read any format directly. */
export type ColorValue = {
  _type: 'variantPickerValue'
  /** Ready-to-use CSS in the field's format, e.g. `rgb(202 165 221 / 0.5)`. */
  css: string
  /** `#RRGGBB`, without alpha (see `alpha`). */
  hex: string
  alpha: number
  rgb: Rgba
  hsl: Hsla
  hsv: Hsva
  oklch: Oklcha
}

export function toColorValue(color: Hsva, format: ColorFormat = 'hex', alpha = false): ColorValue {
  const c = alpha ? color : {...color, a: 1}
  const a = round(c.a, 2)
  const hsl = hsvaToHsla(c)
  const oklch = hsvaToOklcha(c)
  return {
    _type: 'variantPickerValue',
    css: formatColor(c, format, alpha),
    hex: toHex(c),
    alpha: a,
    rgb: {...hsvaToRgba(c), a},
    hsl: {h: Math.round(hsl.h), s: round(hsl.s, 3), l: round(hsl.l, 3), a},
    hsv: {h: round(c.h, 1), s: round(c.s, 3), v: round(c.v, 3), a},
    oklch: {l: round(oklch.l, 3), c: round(oklch.c, 3), h: round(oklch.h, 1), a},
  }
}

/**
 * Read a stored value back from its exact `hex` + `alpha`. `hsv` only supplies the hue for greys
 * and black, which hex can't carry (so the picker doesn't snap to red).
 */
export function fromColorValue(value: Partial<ColorValue> | null | undefined): Hsva | null {
  if (!value) return null
  const parsed = parseColor(value.hex ?? value.css)
  if (!parsed) return null
  const color = {...parsed, a: value.alpha ?? parsed.a}
  const achromatic = color.s === 0 || color.v === 0
  return achromatic && typeof value.hsv?.h === 'number' ? {...color, h: value.hsv.h} : color
}

/** A stored color: a field's `value` or a preset's `color`. */
export type StoredColor = Partial<ColorValue> | null | undefined

/** CSS to paint a stored color. */
export function storedCss(value: StoredColor): string | null {
  if (!value) return null
  if (value.css) return value.css
  const color = fromColorValue(value)
  return color ? formatColor(color, 'rgb', true) : null
}
