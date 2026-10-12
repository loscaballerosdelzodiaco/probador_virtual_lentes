import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const sharedTest = {
  environment: 'jsdom' as const,
  setupFiles: './src/test/setup.ts',
  env: {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  },
}

export default defineConfig({
  plugins: [react()],
  test: {
    ...sharedTest,
    projects: [
      {
        test: {
          ...sharedTest,
          name: 'unit',
          include: ['src/test/**/*.test.ts'],
        },
      },
      {
        test: {
          ...sharedTest,
          name: 'integration',
          include: ['src/test/**/*.test.tsx'],
        },
      },
    ],
  },
})

