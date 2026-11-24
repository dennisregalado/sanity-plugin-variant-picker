// Renders the README screenshots into docs/: `node scripts/screenshots/capture.mjs`.
// Uses the Chromium that Playwright finds (no `playwright install` needed where it's preinstalled).
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'

import {createServer} from 'vite'

// Playwright isn't a dependency: `require` finds a global install (NODE_PATH), as on CI images
// that preinstall it. Elsewhere, `npm i -g playwright` first.
const {chromium} = createRequire(import.meta.url)('playwright')

const root = fileURLToPath(new URL('.', import.meta.url))
const docs = fileURLToPath(new URL('../../docs/', import.meta.url))

const server = await createServer({
  root,
  logLevel: 'error',
  server: {port: 5199, strictPort: true},
  define: {'process.env': {}},
})
await server.listen()

const browser = await chromium.launch()
const page = await browser.newPage({viewport: {width: 380, height: 390}, deviceScaleFactor: 2})
const errors = []
page.on('pageerror', (error) => errors.push(error))

// Empty, focused: the popover lists the options.
await page.goto('http://localhost:5199/')
await page.getByPlaceholder('Search a variant').click()
await page.getByText('Variants').waitFor()
await page.waitForTimeout(400)
await page.screenshot({path: `${docs}empty.png`})

// Picked.
await page.goto('http://localhost:5199/?value=square')
await page.getByRole('button', {name: 'Replace variant'}).waitFor()
await page.waitForTimeout(200)
await page.screenshot({path: `${docs}picked.png`, clip: {x: 0, y: 0, width: 380, height: 90}})

await browser.close()
await server.close()
if (errors.length) {
  console.error(errors)
  process.exit(1)
}
