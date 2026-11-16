# sanity-plugin-variant-picker

A Sanity Studio field built like a link picker: one input and a popover. Forked from [sanity-plugin-color-select](https://github.com/dennisregalado/sanity-plugin-color-select), with its presets and color picker removed.

- **Paste**: paste any CSS color (`#AE2525`, `rgb(…)`, `hsl(…)`, `oklch(…)`) to apply it immediately, or type one and press Enter.
- **Portable Text** text-color and highlight marks with the same UI.
- **A GROQ-friendly value**: `css`, `hex`, `alpha`, `rgb`, `hsl`, `hsv` and `oklch`, written by the Studio so your frontend doesn't convert anything.

## Install

```sh
npm install sanity-plugin-variant-picker
```

**Requirements:** Sanity Studio 6. `@sanity/ui` (v4) and `@sanity/icons` (v5) are peer dependencies, and `sanity` already installs them, so there's nothing else to add. The plugin uses your Studio's copy.

```ts
// sanity.config.ts
import {defineConfig} from 'sanity'
import {variantPicker} from 'sanity-plugin-variant-picker'

export default defineConfig({
  // ...
  plugins: [variantPicker()],
})
```

## Usage

```ts
import {defineField} from 'sanity'

defineField({
  name: 'background',
  title: 'Background',
  type: 'variantPicker',
})
```

### Options

Pass options to the plugin to set defaults for every field. A field's `options` override them.

```ts
variantPicker({
  format: 'hex', // 'hex' | 'rgb' | 'hsl' | 'oklch'
  alpha: true,
})
```

| Option   | Default |                             |
| -------- | ------- | --------------------------- |
| `format` | `'hex'` | How `value.css` is written. |
| `alpha`  | `true`  | Keep alpha in the value.    |

### Portable Text marks

Add text color and highlight to a block's annotations:

```ts
defineArrayMember({
  type: 'block',
  marks: {
    annotations: [{type: 'variantText'}, {type: 'variantHighlight'}],
  },
})
```

The Studio editor renders marked text in its color. Each mark stores the same object as a field.

## Stored value

```ts
{
  _type: 'variantPicker',
  value: {
    _type: 'variantPickerValue',
    css: '#AE2525', // in the field's `format`, ready to use
    hex: '#AE2525', // always 6-digit, without alpha
    alpha: 1,
    rgb: {r: 174, g: 37, b: 37, a: 1},
    hsl: {h: 0, s: 0.649, l: 0.414, a: 1},
    hsv: {h: 0, s: 0.787, v: 0.682, a: 1},
    oklch: {l: 0.492, c: 0.173, h: 26.4, a: 1},
  },
}
```

## GROQ

```groq
*[_type == "page"][0]{
  "background": background.value.css,
  "backgroundRgb": background.value.rgb,
}
```

Portable Text marks:

```groq
content[]{
  ...,
  markDefs[]{
    ...,
    _type in ["variantText", "variantHighlight"] => {"color": value.css}
  }
}
```

## Utilities

The color helpers the input uses are exported for frontends that need them:

```ts
import {parseColor, formatColor} from 'sanity-plugin-variant-picker'

formatColor(parseColor('#AE2525')!, 'oklch') // 'oklch(49.2% 0.173 26.4)'
```

## Releasing

Releases are published to npm by GitHub Actions ([`publish.yml`](.github/workflows/publish.yml)); nobody runs `npm publish` locally.

1. Bump `version` in `package.json` in your PR.
2. Merge it to `master`. The workflow runs lint, typecheck and build, publishes that version to npm with provenance, then tags `v<version>` and creates a GitHub release. Prerelease versions (e.g. `1.0.0-beta.1`) publish under the `next` dist-tag.

Merges that don't change the version publish nothing. To retry a failed publish, run the workflow from the Actions tab.

## License

MIT © Dennis Regalado
