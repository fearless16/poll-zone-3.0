import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    exclude: [
      'node_modules',
      'src/main.jsx',
      'src/App.jsx',
      'tests/setupTestDB.js',
      'eslint-rules/require-deps.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'src/Components/**',
        'src/main.jsx',
        'src/App.jsx',
        'tests/**',
        'eslint-rules/**',
        'dist/**',
        '*.js',
      ],
    },
  },
})
