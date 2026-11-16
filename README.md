# sanity-plugin-variant-picker

A Sanity Studio `string` field built like a link picker: one input and a popover that searches the field's `options.list`. Forked from [sanity-plugin-color-select](https://github.com/dennisregalado/sanity-plugin-color-select).

- **Native options**: reads `options.list` exactly like a `string` field, so `{title, value}` items and plain strings both work.
- **Search**: type to filter by title or value; Enter picks the first match.
- **A plain string value**: stores the picked item's `value`, the same as a native string select.

## Install

```sh
npm install sanity-plugin-variant-picker
```

**Requirements:** Sanity Studio 6. `@sanity/ui` (v4) is a peer dependency, and `sanity` already installs it, so there's nothing else to add. The plugin uses your Studio's copy.

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
  name: 'size',
  title: 'Size',
  type: 'variantPicker',
  options: {
    list: [
      {title: 'Small', value: 'sm'},
      {title: 'Medium', value: 'md'},
      'large', // shown as "Large", stored as "large"
    ],
  },
})
```

A field's `placeholder` replaces the default "Search a variant". Items without a `value` are skipped.

## Stored value

The picked item's `value`, as a string:

```groq
*[_type == "product"][0]{size}
// {"size": "sm"}
```

Clearing the field (empty it and leave) unsets the value.

## Releasing

Releases are published to npm by GitHub Actions ([`publish.yml`](.github/workflows/publish.yml)); nobody runs `npm publish` locally.

1. Bump `version` in `package.json` in your PR.
2. Merge it to `master`. The workflow runs lint, typecheck and build, publishes that version to npm with provenance, then tags `v<version>` and creates a GitHub release. Prerelease versions (e.g. `1.0.0-beta.1`) publish under the `next` dist-tag.

Merges that don't change the version publish nothing. To retry a failed publish, run the workflow from the Actions tab.

## License

MIT © Dennis Regalado
