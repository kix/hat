/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const DICTIONARY_PATH = fileURLToPath(new URL('./src/data/dictionary.ts', import.meta.url))

// Dev-only: lets the running app delete a bad word straight out of
// dictionary.ts instead of hand-editing 50k lines. Only wired up by
// configureServer, which Vite never calls for a production build.
function deleteWordPlugin(): Plugin {
  return {
    name: 'delete-word',
    configureServer(server) {
      server.middlewares.use('/__delete-word', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const { word } = JSON.parse(body) as { word?: unknown }
            if (typeof word !== 'string' || !word) throw new Error('missing word')

            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const lineRe = new RegExp(`^ *\\{ word: "${escaped}", difficulty:.*\\},?\\n`, 'm')
            const text = readFileSync(DICTIONARY_PATH, 'utf-8')
            if (!lineRe.test(text)) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'word not found' }))
              return
            }

            writeFileSync(DICTIONARY_PATH, text.replace(lineRe, ''))
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: String(error) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/hat/',
  plugins: [react(), deleteWordPlugin()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  test: {
    environment: 'node',
  },
})
