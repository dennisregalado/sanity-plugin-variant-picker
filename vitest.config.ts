import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    // Pure helpers run in Node; component tests (`*.test.tsx`) opt into jsdom per file.
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
  },
})
