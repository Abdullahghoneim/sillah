import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { Prisma } from '@prisma/client'
import { auth } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import { sendStudentInvitationEmail } from '../../lib/mailer'
import {
  acceptInviteQuerySchema,
  inviteStudentSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
} from './students.schemas'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function getSession(req: FastifyRequest) {
  const headers = fromNodeHeaders(req.headers)
  return auth.api.getSession({ headers })
}

async function requireTeacher(req: FastifyRequest, reply: FastifyReply) {
  const session = await getSession(req)
  if (!session) {
    reply.code(401).send({ error: 'Not authenticated' })
    return null
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!dbUser) {
    reply.code(401).send({ error: 'Not authenticated' })
    return null
  }
  if (dbUser.role !== 'TEACHER') {
    reply.code(403).send({ error: 'Teacher access required' })
    return null
  }
  return dbUser
}

async function requireStudent(req: FastifyRequest, reply: FastifyReply) {
  const session = await getSession(req)
  if (!session) {
    reply.code(401).send({ error: 'Not authenticated' })
    return null
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!dbUser) {
    reply.code(401).send({ error: 'Not authenticated' })
    return null
  }
  if (dbUser.role !== 'STUDENT') {
    reply.code(403).send({ error: 'Student access required' })
    return null
  }
  return dbUser
}

function buildAgeFilter(
  age: 'under8' | '8-12' | 'over12' | undefined,
): Prisma.StudentWhereInput {
  if (!age) return {}
  if (age === 'under8') return { age: { lt: 8 } }
  if (age === '8-12') return { age: { gte: 8, lte: 12 } }
  return { age: { gt: 12 } }
}

const studentPublicSelect = {
  id: true,
  name: true,
  email: true,
  age: true,
  level: true,
  status: true,
  parentEmail: true,
  avatarUrl: true,
  teacherId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSelect

export async function studentsModuleRoutes(app: FastifyInstance) {
  app.get('/students', async (req, reply) => {
    const teacher = await requireTeacher(req, reply)
    if (!teacher) return

    const query = listStudentsQuerySchema.parse(req.query)

    const where: Prisma.StudentWhereInput = {
      teacherId: teacher.id,
      ...buildAgeFilter(query.age),
      ...(query.level ? { level: query.level } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { parentEmail: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const skip = (query.page - 1) * query.limit
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: studentPublicSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.student.count({ where }),
    ])

    return {
      students,
      total,
      page: query.page,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    }
  })

  app.post('/students/invite', async (req, reply) => {
    const teacher = await requireTeacher(req, reply)
    if (!teacher) return

    const body = inviteStudentSchema.parse(req.body)

    const existing = await prisma.student.findFirst({
      where: { teacherId: teacher.id, email: body.email },
      select: { id: true },
    })
    if (existing) {
      return reply
        .code(409)
        .send({ error: 'You already invited a student with that email' })
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

    const student = await prisma.student.create({
      data: {
        name: body.name,
        email: body.email,
        age: body.age ?? null,
        level: body.level,
        status: 'INACTIVE',
        parentEmail: body.parentEmail ?? null,
        teacherId: teacher.id,
        invitation: {
          create: {
            email: body.email,
            expiresAt,
          },
        },
      },
      include: { invitation: true },
    })

    if (!student.invitation) {
      return reply.code(500).send({ error: 'Failed to create invitation' })
    }

    try {
      await sendStudentInvitationEmail({
        to: body.email,
        studentName: body.name,
        teacherName: teacher.name,
        token: student.invitation.token,
        expiresAt,
      })
    } catch (err) {
      req.log.error({ err }, 'Failed to send invitation email')
    }

    return reply.code(201).send({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        age: student.age,
        level: student.level,
        status: student.status,
        parentEmail: student.parentEmail,
        avatarUrl: student.avatarUrl,
        teacherId: student.teacherId,
        userId: student.userId,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      invitation: {
        id: student.invitation.id,
        status: student.invitation.status,
        expiresAt: student.invitation.expiresAt,
      },
    })
  })

  app.get('/students/me', async (req, reply) => {
    const studentUser = await requireStudent(req, reply)
    if (!studentUser) return

    const student = await prisma.student.findUnique({
      where: { userId: studentUser.id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        progress: true,
      },
    })

    if (!student) {
      return reply.code(404).send({ error: 'Student profile not found' })
    }

    return { student }
  })

  app.post('/students/invitations/accept', async (req, reply) => {
    const query = acceptInviteQuerySchema.parse(req.query)

    const invitation = await prisma.studentInvitation.findUnique({
      where: { token: query.token },
      include: { student: true },
    })

    if (!invitation) {
      return reply.code(400).send({ error: 'INVALID_TOKEN' })
    }
    if (invitation.status !== 'PENDING') {
      return reply.code(400).send({ error: 'INVALID_TOKEN' })
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await prisma.studentInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      return reply.code(400).send({ error: 'EXPIRED_TOKEN' })
    }

    const session = await getSession(req)

    if (session) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      })
      if (!dbUser || dbUser.role !== 'STUDENT') {
        return reply.code(403).send({ error: 'Student account required' })
      }

      const alreadyAttached = await prisma.student.findUnique({
        where: { userId: dbUser.id },
        select: { id: true },
      })
      if (alreadyAttached && alreadyAttached.id !== invitation.studentId) {
        await prisma.student.update({
          where: { id: alreadyAttached.id },
          data: { userId: null },
        })
      }

      await prisma.$transaction([
        prisma.studentInvitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        }),
        prisma.student.update({
          where: { id: invitation.studentId },
          data: { status: 'ACTIVE', userId: dbUser.id },
        }),
      ])

      const linked = await prisma.student.findUnique({
        where: { id: invitation.studentId },
        select: studentPublicSelect,
      })
      return { student: linked }
    }

    return reply.code(200).send({
      valid: true,
      studentName: invitation.student.name,
      email: invitation.email,
    })
  })

  app.get<{ Params: { studentId: string } }>(
    '/students/:studentId',
    async (req, reply) => {
      const teacher = await requireTeacher(req, reply)
      if (!teacher) return

      const student = await prisma.student.findUnique({
        where: { id: req.params.studentId },
        include: { progress: true },
      })
      if (!student) {
        return reply.code(404).send({ error: 'Student not found' })
      }
      if (student.teacherId !== teacher.id) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
      return { student }
    },
  )

  app.patch<{ Params: { studentId: string } }>(
    '/students/:studentId',
    async (req, reply) => {
      const teacher = await requireTeacher(req, reply)
      if (!teacher) return

      const body = updateStudentSchema.parse(req.body)

      const existing = await prisma.student.findUnique({
        where: { id: req.params.studentId },
        select: { id: true, teacherId: true },
      })
      if (!existing) {
        return reply.code(404).send({ error: 'Student not found' })
      }
      if (existing.teacherId !== teacher.id) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const updated = await prisma.student.update({
        where: { id: req.params.studentId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.age !== undefined ? { age: body.age } : {}),
          ...(body.level !== undefined ? { level: body.level } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        },
        select: studentPublicSelect,
      })
      return updated
    },
  )

  app.delete<{ Params: { studentId: string } }>(
    '/students/:studentId',
    async (req, reply) => {
      const teacher = await requireTeacher(req, reply)
      if (!teacher) return

      const existing = await prisma.student.findUnique({
        where: { id: req.params.studentId },
        select: { id: true, teacherId: true },
      })
      if (!existing) {
        return reply.code(404).send({ error: 'Student not found' })
      }
      if (existing.teacherId !== teacher.id) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      await prisma.student.delete({ where: { id: req.params.studentId } })
      return reply.code(204).send()
    },
  )
}
