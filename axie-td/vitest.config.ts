import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Les tests de simulation tournent en Node, ceux de sauvegarde ont besoin du DOM.
    environmentMatchGlobs: [
      ['tests/save/**', 'jsdom'],
      ['tests/ui/**', 'jsdom'],
    ],
  },
})
