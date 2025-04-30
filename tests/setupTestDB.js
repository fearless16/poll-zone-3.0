import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Initializes and returns a Firebase emulator test environment.
 * Loads Firestore security rules from local file and creates isolated context.
 */
export const initTestEnv = async () => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  const testEnv = await initializeTestEnvironment({
    projectId: 'vote-test',
    firestore: {
      host: '127.0.0.1',
      port: 8088, // 👈 SAME as your firebase.json
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  })

  return testEnv
}
