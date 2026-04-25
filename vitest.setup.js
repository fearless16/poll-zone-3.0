import { afterAll } from 'vitest'
import '@testing-library/jest-dom'

afterAll(() => {
  setTimeout(() => {
    process.exit(0)
  }, 100)
})
