import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),

  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.preprocess(
    (v) => (v === '' || v === undefined ? 'http://localhost:3000' : v),
    z.string().url(),
  ),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Sillah <noreply@sillah.local>'),
})

export const env = schema.parse(process.env)
