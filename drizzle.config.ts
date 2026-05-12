import type { Config } from 'drizzle-kit'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local manually for drizzle-kit (it doesn't use Next.js env loading)
try {
  const envPath = join(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf-8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && !process.env[key]) process.env[key] = rest.join('=')
  }
} catch {}

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
