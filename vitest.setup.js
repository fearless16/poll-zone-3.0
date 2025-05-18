import { afterAll } from 'vitest'

afterAll(() => {
  setTimeout(() => {
    process.exit(0)
  }, 100)
})
