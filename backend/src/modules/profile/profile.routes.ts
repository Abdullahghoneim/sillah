import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import { env } from '../../config/env'
import { AVATARS_DIR } from '../../app'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
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

function avatarUrlFromFilename(filename: string): string {
  return `${env.APP_URL.replace(/\/+$/, '')}/uploads/avatars/${filename}`
}

function filenameFromAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const segs = u.pathname.split('/').filter(Boolean)
    if (segs.length < 3) return null
    if (segs[0] !== 'uploads' || segs[1] !== 'avatars') return null
    const file = segs[2]
    if (!/^[A-Za-z0-9._-]+$/.test(file)) return null
    return file
  } catch {
    return null
  }
}

async function bestEffortDelete(filename: string | null) {
  if (!filename) return
  const fullPath = path.join(AVATARS_DIR, filename)
  if (!fullPath.startsWith(AVATARS_DIR + path.sep)) return
  try {
    await fs.unlink(fullPath)
  } catch {
    // file may already be gone or unreadable
  }
}

export async function profileModuleRoutes(app: FastifyInstance) {
  // POST /api/users/me/avatar — upload a new avatar (multipart/form-data, field "file")
  app.post('/users/me/avatar', async (req, reply) => {
    const session = await requireSession(req, reply)
    if (!session) return

    if (!req.isMultipart()) {
      return reply
        .code(400)
        .send({ error: 'Expected multipart/form-data with a "file" field' })
    }

    let part: Awaited<ReturnType<typeof req.file>>
    try {
      part = await req.file()
    } catch (err) {
      req.log.error({ err }, 'failed to read multipart file')
      return reply.code(400).send({ error: 'Invalid upload' })
    }

    if (!part) {
      return reply.code(400).send({ error: 'No file provided' })
    }

    const ext = MIME_TO_EXT[part.mimetype]
    if (!ext) {
      try {
        await part.toBuffer()
      } catch {
        /* drain */
      }
      return reply.code(415).send({
        error: 'Unsupported file type. Upload JPEG, PNG, or WEBP.',
      })
    }

    let buffer: Buffer
    try {
      buffer = await part.toBuffer()
    } catch (err) {
      const e = err as { code?: string }
      if (e?.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.code(413).send({ error: 'File too large. Max 5 MB.' })
      }
      req.log.error({ err }, 'failed to buffer uploaded avatar')
      return reply.code(400).send({ error: 'Invalid upload' })
    }

    if (buffer.byteLength === 0) {
      return reply.code(400).send({ error: 'File is empty' })
    }
    if (buffer.byteLength > MAX_AVATAR_BYTES) {
      return reply.code(413).send({ error: 'File too large. Max 5 MB.' })
    }

    const safeUserId = session.user.id.replace(/[^A-Za-z0-9_-]/g, '_')
    const filename = `${safeUserId}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString('hex')}.${ext}`
    const fullPath = path.join(AVATARS_DIR, filename)

    try {
      await fs.writeFile(fullPath, buffer)
    } catch (err) {
      req.log.error({ err }, 'failed to write avatar to disk')
      return reply.code(500).send({ error: 'Could not save the avatar' })
    }

    const url = avatarUrlFromFilename(filename)

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: url },
      select: { id: true, image: true },
    })

    if (existing?.image && existing.image !== url) {
      await bestEffortDelete(filenameFromAvatarUrl(existing.image))
    }

    return reply.code(200).send({ image: updated.image })
  })

  // DELETE /api/users/me/avatar — clear the avatar
  app.delete('/users/me/avatar', async (req, reply) => {
    const session = await requireSession(req, reply)
    if (!session) return

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    })

    await bestEffortDelete(filenameFromAvatarUrl(existing?.image ?? null))

    return reply.code(204).send()
  })
}
