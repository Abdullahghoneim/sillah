import { randomUUID } from 'crypto'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import { registerSchema, updateProfileSchema } from './auth.schemas'

class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

async function getSession(req: FastifyRequest) {
  const headers = fromNodeHeaders(req.headers)
  return auth.api.getSession({ headers })
}

async function requireSession(req: FastifyRequest, reply: FastifyReply) {
  const session = await getSession(req)
  if (!session) {
    reply.code(401).send({ error: 'Not authenticated' })
    return null
  }
  return session
}

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function authModuleRoutes(app: FastifyInstance) {
  // Sign-up: create unverified user. Frontend then calls Better Auth's
  // /email-otp/send-verification-otp to dispatch the OTP.
  app.post('/auth/register', async (req, reply) => {
    const body = registerSchema.parse(req.body)

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    })
    if (existing) {
      throw new HttpError(409, 'Email already registered')
    }

    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        emailVerified: false,
        role: 'STUDENT',
      },
      select: userPublicSelect,
    })

    return reply.code(201).send({ user, otpRequired: true })
  })

  // Current user — richer than Better Auth's /get-session (includes phone, role)
  app.get('/users/me', async (req, reply) => {
    const session = await requireSession(req, reply)
    if (!session) return
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: userPublicSelect,
    })
    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }
    return user
  })

  // Update profile (used by the role-select screen, and any future profile edits)
  app.patch('/users/me', async (req, reply) => {
    const session = await requireSession(req, reply)
    if (!session) return
    const body = updateProfileSchema.parse(req.body)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
      },
      select: userPublicSelect,
    })
    return user
  })
}
