import path from 'path'
import fs from 'fs'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { fromNodeHeaders } from 'better-auth/node'
import { ZodError } from 'zod'
import { auth } from './lib/auth'
import { authModuleRoutes } from './modules/auth/auth.routes'
import { studentsModuleRoutes } from './modules/students/students.routes'
import { profileModuleRoutes } from './modules/profile/profile.routes'

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
export const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars')

export function buildApp() {
  const app = Fastify({ logger: true })

  // Ensure the uploads directory tree exists before static serving registers.
  fs.mkdirSync(AVATARS_DIR, { recursive: true })

  app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
  app.register(cors, { origin: true, credentials: true })
  app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  })
  app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.get('/health', async () => ({ status: 'ok' }))

  // Invitation handoff: redirects email-link clicks into the Expo app via the
  // `sillah://` deep-link scheme. If the user doesn't have the app installed,
  // they see the fallback page.
  app.get<{ Querystring: { token?: string } }>(
    '/invite/accept',
    async (req, reply) => {
      const rawToken = (req.query.token ?? '').trim()
      const tokenIsValid = /^[A-Za-z0-9_-]{6,128}$/.test(rawToken)
      const safeToken = tokenIsValid ? rawToken : ''
      const deepLink = safeToken
        ? `sillah://invite/accept?token=${encodeURIComponent(safeToken)}`
        : ''
      reply.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sillah Invitation</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F7FFFF; color: #091E42; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(15,23,42,0.08); padding: 32px; max-width: 420px; width: 100%; text-align: center; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    p { color: #5D6B82; font-size: 14px; margin: 0 0 20px; line-height: 1.5; }
    .btn { display: inline-block; background: #2CA1AB; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .btn:hover { background: #22838C; }
    .muted { color: #9CA3AF; font-size: 12px; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    ${
      safeToken
        ? `<h1>Opening Sillah…</h1>
           <p>You've been invited to learn Arabic on Sillah. We're opening the app for you now.</p>
           <a class="btn" id="open" href="${deepLink}">Open in Sillah</a>
           <p class="muted">If nothing happens, install the Sillah app and tap the button above again.</p>
           <script>
             (function(){
               var deep = ${JSON.stringify(deepLink)};
               setTimeout(function(){ window.location.replace(deep); }, 150);
             })();
           </script>`
        : `<h1>Invitation link invalid</h1>
           <p>This invitation link is missing or malformed. Please ask your teacher to send a new one.</p>`
    }
  </div>
</body>
</html>`)
    },
  )

  // Better Auth catch-all — handles /api/auth/email-otp/*, /sign-in/email-otp,
  // /sign-out, /get-session, /update-user, etc.
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`)
        const headers = fromNodeHeaders(request.headers)
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        })
        const response = await auth.handler(req)
        reply.status(response.status)
        response.headers.forEach((value, key) => reply.header(key, value))
        return reply.send(response.body ? await response.text() : null)
      } catch (err) {
        app.log.error(err)
        return reply.status(500).send({ error: 'Authentication error' })
      }
    },
  })

  // Custom auth + user-profile routes
  app.register(authModuleRoutes, { prefix: '/api' })
  app.register(studentsModuleRoutes, { prefix: '/api' })
  app.register(profileModuleRoutes, { prefix: '/api' })

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: err.issues })
    }
    const statusCode = (err as { statusCode?: number }).statusCode ?? 500
    if (statusCode >= 500) app.log.error(err)
    return reply.code(statusCode).send({ error: err.message })
  })

  return app
}
