/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const DICTIONARY_PATH = fileURLToPath(new URL('./src/data/dictionary.ts', import.meta.url))
const RARE_WORD_FREQUENCY = 0.05

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
  })
}

function respondJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.end(JSON.stringify(payload))
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Dev-only word-list curation: lets the running app edit dictionary.ts
// straight from the UI instead of hand-editing 50k lines. Only wired up by
// configureServer, which Vite never calls for a production build.
function wordCurationPlugin(): Plugin {
  return {
    name: 'word-curation',
    configureServer(server) {
      server.middlewares.use('/__delete-word', (req, res) => {
        if (req.method !== 'POST') return respondJson(res, 405, { error: 'method not allowed' })

        void readJsonBody(req).then(
          (body) => {
            const { word } = body as { word?: unknown }
            if (typeof word !== 'string' || !word) return respondJson(res, 400, { error: 'missing word' })

            const lineRe = new RegExp(`^ *\\{ word: "${escapeForRegExp(word)}", difficulty:.*\\},?\\n`, 'm')
            const text = readFileSync(DICTIONARY_PATH, 'utf-8')
            if (!lineRe.test(text)) return respondJson(res, 404, { error: 'word not found' })

            writeFileSync(DICTIONARY_PATH, text.replace(lineRe, ''))
            respondJson(res, 200, { ok: true })
          },
          (error) => respondJson(res, 400, { error: String(error) }),
        )
      })

      server.middlewares.use('/__set-word-frequency', (req, res) => {
        if (req.method !== 'POST') return respondJson(res, 405, { error: 'method not allowed' })

        void readJsonBody(req).then(
          (body) => {
            const { word } = body as { word?: unknown }
            if (typeof word !== 'string' || !word) return respondJson(res, 400, { error: 'missing word' })

            const lineRe = new RegExp(
              `^( *\\{ word: "${escapeForRegExp(word)}", difficulty: "\\w+", frequency: )[\\d.]+(,.*\\},?\\n)`,
              'm',
            )
            const text = readFileSync(DICTIONARY_PATH, 'utf-8')
            if (!lineRe.test(text)) return respondJson(res, 404, { error: 'word not found' })

            writeFileSync(DICTIONARY_PATH, text.replace(lineRe, `$1${RARE_WORD_FREQUENCY}$2`))
            respondJson(res, 200, { ok: true })
          },
          (error) => respondJson(res, 400, { error: String(error) }),
        )
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/hat/',
  plugins: [react(), wordCurationPlugin()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  test: {
    environment: 'node',
  },
})
