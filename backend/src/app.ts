import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { fromNodeHeaders } from 'better-auth/node'
import { ZodError } from 'zod'
import { auth } from './lib/auth'
import { authModuleRoutes } from './modules/auth/auth.routes'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(helmet)
  app.register(cors, { origin: true, credentials: true })

  app.get('/health', async () => ({ status: 'ok' }))

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
