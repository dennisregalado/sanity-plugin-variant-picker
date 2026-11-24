# sanity-plugin-variant-picker

A Sanity Studio `string` field built like a link picker: one input and a popover that searches the field's `options.list`. Forked from [sanity-plugin-color-select](https://github.com/dennisregalado/sanity-plugin-color-select).

- **Native options**: reads `options.list` exactly like a `string` field, so `{title, value}` items and plain strings both work.
- **Icons**: give an item an `icon` and it shows on the left, in the list and on the picked value.
- **Search**: type to filter by title or value; Enter picks the highlighted item, or the first match.
- **Keyboard and screen readers**: a combobox with a listbox popup. Arrow keys move the highlight, Enter picks, Escape or Tab closes. See [Keyboard](#keyboard).
- **Picked value**: shown as a native preview row, like sanity-plugin-color-select. The row and the pencil open the search; the value stays until you pick another. An × clears it on fields that aren't required.
- **Values not in the list**: a stored value missing from `options.list` (a typo, or a removed option) is marked "Not in list" in a caution tone.
- **A plain string value**: stores the picked item's `value`, the same as a native string select.
- **Existing fields too**: `stringLists: true` puts the picker on every `string` field with an `options.list`, with no schema changes.

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
import MoonIcon from '@sanity/icons/Moon'
import SunIcon from '@sanity/icons/Sun'

defineField({
  name: 'size',
  title: 'Size',
  type: 'variantPicker',
  options: {
    list: [
      {title: 'Small', value: 'sm', icon: SunIcon},
      {title: 'Medium', value: 'md', icon: MoonIcon},
      'large', // shown as "Large", stored as "large"
    ],
  },
})
```

`icon` takes a component (e.g. from `@sanity/icons`), an element, or an emoji string. Set a field's placeholder with `options.placeholder` (default "Search a variant"): Sanity drops a field-level `placeholder` on types that extend `string`. Items without a `value` are skipped.

## Keyboard

| Where      | Key                   | Does                                                         |
| ---------- | --------------------- | ------------------------------------------------------------ |
| Search     | typing                | Filters the list and highlights the first match              |
| Search     | ↓ / ↑                 | Opens the list, then moves the highlight (wrapping)          |
| Search     | Enter                 | Picks the highlighted item (or the first match)              |
| Search     | Escape                | Closes the list and drops the search; the value is unchanged |
| Search     | Tab                   | Leaves the field and closes the list; the value is unchanged |
| Picked row | Enter / Space / ↓ / ↑ | Opens the search with the picked item highlighted            |
| Picked row | a letter              | Opens the search with that letter typed                      |

After a pick, focus moves to the picked row. The search input is a `role="combobox"` with `aria-expanded`, `aria-controls` and `aria-activedescendant`. The list is a `role="listbox"`, and each item is a `role="option"` with `aria-selected` on the stored value.

## Existing string fields

To use the picker on the `string` fields you already have, turn on `stringLists`:

```ts
plugins: [variantPicker({stringLists: true})]
```

Every `string` field with a non-empty `options.list` then gets the picker, with no schema changes. The field keeps `type: 'string'`, so `sanity typegen` still generates its literal union (`'sm' | 'md'`). With `type: 'variantPicker'` it generates `string`. Stored values don't change.

It skips:

- **Radio groups** (`options.layout: 'radio'`): every option is visible and one click away, so they stay native. Set `layout: 'dropdown'` (or drop `layout`) to switch one over.
- **Fields with their own input** (`components.input`, on the field or on a type it extends): those always win.

For a single field instead, keep `type: 'string'` and set the input yourself:

```ts
import {VariantPickerInput} from 'sanity-plugin-variant-picker'

defineField({
  name: 'size',
  type: 'string',
  options: {list: ['small', 'large']},
  components: {input: VariantPickerInput},
})
```

## Stored value

The picked item's `value`, as a string:

```groq
*[_type == "product"][0]{size}
// {"size": "sm"}
```

The value changes only when you pick an item, or clear it. The row and the pencil open the search over the current value. Escape, Tab or a click outside closes it and keeps the old value. The × unsets the value. It only shows when the field isn't required (`validation: (rule) => rule.required()`).

## Releasing

Releases are published to npm by GitHub Actions ([`publish.yml`](.github/workflows/publish.yml)); nobody runs `npm publish` locally. (0.1.0, the first release, was published by hand: npm trusted publishing can only be set up once a package exists.)

1. Bump `version` in `package.json` in your PR.
2. Merge it to `master`. The workflow runs lint, typecheck, tests and build, publishes that version to npm with provenance, then tags `v<version>` and creates a GitHub release. Prerelease versions (e.g. `1.0.0-beta.1`) publish under the `next` dist-tag.

Merges that don't change the version publish nothing. To retry a failed publish, run the workflow from the Actions tab.

## License

MIT © Dennis Regalado
