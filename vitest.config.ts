import { defineConfig } from 'vitest/config'

// Pruebas de lógica de la app (src). Las de las Edge Functions son de Deno: van con deno test.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
