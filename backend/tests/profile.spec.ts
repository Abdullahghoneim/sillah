import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'
import path from 'path'
import fs from 'fs/promises'

const API = 'http://localhost:3000'
const MAILPIT = 'http://localhost:8025'

// Smallest valid 1×1 PNG (~70 bytes) for upload tests.
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000122' +
    '5e0a6700000000049454e44ae426082',
  'hex',
)

// Smallest valid 1×1 JPEG used to assert MIME variety.
const TINY_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e' +
    '1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc2000b080001000101011100ffc4001f000001050101' +
    '01010101000000000000000000010203040506070809ab0affda0008010100003f00fbff00ffd9',
  'hex',
)

const FAKE_TEXT = Buffer.from('this is not an image', 'utf-8')

async function waitForOtp(
  ctx: APIRequestContext,
  email: string,
  timeoutMs = 20_000,
): Promise<string> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const r = await ctx.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )
    if (r.ok()) {
      const data = (await r.json()) as { messages?: Array<{ ID: string }> }
      if (data.messages?.length) {
        const detail = await ctx.get(
          `${MAILPIT}/api/v1/message/${data.messages[0].ID}`,
        )
        const body = (await detail.json()) as { Text?: string }
        const m = body.Text?.match(/\b(\d{6})\b/)
        if (m) return m[1]
      }
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`OTP for ${email} not found within ${timeoutMs}ms`)
}

async function newSignedInUser(opts: { name: string; phone?: string }) {
  const email = `prof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  // Clear inherited `content-type: application/json` so multipart uploads
  // work — Playwright auto-sets the correct header per call type.
  const ctx = await pwRequest.newContext({ extraHTTPHeaders: {} })
  await ctx.post(`${API}/api/auth/register`, {
    data: {
      name: opts.name,
      email,
      phone: opts.phone,
      acceptTerms: true,
    },
  })
  await ctx.post(`${API}/api/auth/email-otp/send-verification-otp`, {
    data: { email, type: 'sign-in' },
  })
  const otp = await waitForOtp(ctx, email)
  await ctx.post(`${API}/api/auth/sign-in/email-otp`, {
    data: { email, otp },
  })
  return { ctx, email }
}

const AVATARS_DIR = path.resolve(__dirname, '..', 'uploads', 'avatars')

test.beforeEach(async ({ request }) => {
  await request.delete(`${MAILPIT}/api/v1/messages`).catch(() => {})
})

// ───────────────────────────────────────────────────────────
// PATCH /api/users/me — name / phone / image updates
// ───────────────────────────────────────────────────────────

test('PATCH /api/users/me updates name and phone', async () => {
  const { ctx } = await newSignedInUser({ name: 'Original Name' })

  const r = await ctx.patch(`${API}/api/users/me`, {
    data: { name: 'Renamed', phone: '+201111111111' },
  })
  expect(r.ok()).toBeTruthy()
  const body = await r.json()
  expect(body.name).toBe('Renamed')
  expect(body.phone).toBe('+201111111111')

  await ctx.dispose()
})

test('PATCH /api/users/me rejects an invalid phone format', async () => {
  const { ctx } = await newSignedInUser({ name: 'Phone Test' })
  const r = await ctx.patch(`${API}/api/users/me`, {
    data: { phone: 'not-a-phone' },
  })
  expect(r.status()).toBe(400)
  await ctx.dispose()
})

test('PATCH /api/users/me rejects an invalid image URL', async () => {
  const { ctx } = await newSignedInUser({ name: 'Image URL Test' })
  const r = await ctx.patch(`${API}/api/users/me`, {
    data: { image: 'not-a-url' },
  })
  expect(r.status()).toBe(400)
  await ctx.dispose()
})

test('PATCH /api/users/me accepts a valid image URL', async () => {
  const { ctx } = await newSignedInUser({ name: 'Image URL Test' })
  const r = await ctx.patch(`${API}/api/users/me`, {
    data: { image: 'https://cdn.example.com/me.png' },
  })
  expect(r.ok()).toBeTruthy()
  const body = await r.json()
  expect(body.image).toBe('https://cdn.example.com/me.png')
  await ctx.dispose()
})

test('PATCH /api/users/me with image=null clears the image', async () => {
  const { ctx } = await newSignedInUser({ name: 'Clear Image' })
  await ctx.patch(`${API}/api/users/me`, {
    data: { image: 'https://cdn.example.com/x.png' },
  })
  const cleared = await ctx.patch(`${API}/api/users/me`, {
    data: { image: null },
  })
  expect(cleared.ok()).toBeTruthy()
  const body = await cleared.json()
  expect(body.image).toBeNull()
  await ctx.dispose()
})

test('PATCH /api/users/me persists bio and is surfaced via GET /users/me', async () => {
  const { ctx } = await newSignedInUser({ name: 'Bio Writer' })
  const r = await ctx.patch(`${API}/api/users/me`, {
    data: { bio: 'Teaching Arabic for 8 years.' },
  })
  expect(r.ok()).toBeTruthy()
  expect((await r.json()).bio).toBe('Teaching Arabic for 8 years.')

  const me = await ctx.get(`${API}/api/users/me`)
  expect((await me.json()).bio).toBe('Teaching Arabic for 8 years.')
  await ctx.dispose()
})

test('PATCH /api/users/me bio=null clears it; whitespace-only also clears it', async () => {
  const { ctx } = await newSignedInUser({ name: 'Bio Clear' })
  await ctx.patch(`${API}/api/users/me`, { data: { bio: 'placeholder' } })

  const cleared = await ctx.patch(`${API}/api/users/me`, {
    data: { bio: null },
  })
  expect((await cleared.json()).bio).toBeNull()

  await ctx.patch(`${API}/api/users/me`, { data: { bio: 'temp' } })
  const blanked = await ctx.patch(`${API}/api/users/me`, {
    data: { bio: '   ' },
  })
  expect((await blanked.json()).bio).toBeNull()
  await ctx.dispose()
})

test('PATCH /api/users/me rejects a bio longer than 500 characters', async () => {
  const { ctx } = await newSignedInUser({ name: 'Bio Limit' })
  const big = 'x'.repeat(501)
  const r = await ctx.patch(`${API}/api/users/me`, { data: { bio: big } })
  expect(r.status()).toBe(400)
  await ctx.dispose()
})

// ───────────────────────────────────────────────────────────
// POST /api/users/me/avatar — multipart upload
// ───────────────────────────────────────────────────────────

test('POST /api/users/me/avatar without auth returns 401', async () => {
  const anon = await pwRequest.newContext({ extraHTTPHeaders: {} })
  const r = await anon.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'a.png', mimeType: 'image/png', buffer: TINY_PNG },
    },
  })
  expect(r.status()).toBe(401)
  await anon.dispose()
})

test('POST /api/users/me/avatar uploads a PNG, sets image URL, and serves the file', async () => {
  const { ctx } = await newSignedInUser({ name: 'Avatar Owner' })

  const upload = await ctx.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'me.png', mimeType: 'image/png', buffer: TINY_PNG },
    },
  })
  expect(upload.status()).toBe(200)
  const body = await upload.json()
  expect(body.image).toMatch(
    /^http:\/\/localhost:3000\/uploads\/avatars\/.+\.png$/,
  )

  // GET /api/users/me reflects the new image
  const me = await ctx.get(`${API}/api/users/me`)
  const meBody = await me.json()
  expect(meBody.image).toBe(body.image)

  // The static file is now reachable
  const fetched = await ctx.get(body.image)
  expect(fetched.status()).toBe(200)
  expect(fetched.headers()['content-type']).toContain('image/png')

  // It lives on disk under uploads/avatars
  const url = new URL(body.image as string)
  const filename = url.pathname.split('/').pop() as string
  const onDisk = await fs.stat(path.join(AVATARS_DIR, filename))
  expect(onDisk.size).toBeGreaterThan(0)

  await ctx.dispose()
})

test('POST /api/users/me/avatar accepts JPEG', async () => {
  const { ctx } = await newSignedInUser({ name: 'Jpeg Owner' })
  const upload = await ctx.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: TINY_JPEG },
    },
  })
  expect(upload.status()).toBe(200)
  const body = await upload.json()
  expect(body.image).toMatch(/\.jpg$/)
  await ctx.dispose()
})

test('POST /api/users/me/avatar rejects non-image content with 415', async () => {
  const { ctx } = await newSignedInUser({ name: 'Bad Mime' })
  const upload = await ctx.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'a.txt', mimeType: 'text/plain', buffer: FAKE_TEXT },
    },
  })
  expect(upload.status()).toBe(415)
  await ctx.dispose()
})

test('POST /api/users/me/avatar rejects files over 5 MB with 413', async () => {
  const { ctx } = await newSignedInUser({ name: 'Too Big' })
  const big = Buffer.alloc(5 * 1024 * 1024 + 1024, 0x00) // 5 MB + 1 KB
  const upload = await ctx.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'big.png', mimeType: 'image/png', buffer: big },
    },
  })
  expect(upload.status()).toBe(413)
  await ctx.dispose()
})

test('POST /api/users/me/avatar without multipart returns 400', async () => {
  const { ctx } = await newSignedInUser({ name: 'No Multipart' })
  const r = await ctx.post(`${API}/api/users/me/avatar`, {
    headers: { 'content-type': 'application/json' },
    data: { something: 'else' },
  })
  expect(r.status()).toBe(400)
  await ctx.dispose()
})

test('POST /api/users/me/avatar replaces the previous file on disk', async () => {
  const { ctx } = await newSignedInUser({ name: 'Replace Test' })

  const first = await ctx.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'one.png', mimeType: 'image/png', buffer: TINY_PNG },
    },
  })
  const firstBody = await first.json()
  const firstFile = new URL(firstBody.image as string).pathname
    .split('/')
    .pop() as string

  const second = await ctx.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'two.png', mimeType: 'image/png', buffer: TINY_PNG },
    },
  })
  const secondBody = await second.json()
  expect(secondBody.image).not.toBe(firstBody.image)

  await expect(fs.stat(path.join(AVATARS_DIR, firstFile))).rejects.toThrow()
  const secondFile = new URL(secondBody.image as string).pathname
    .split('/')
    .pop() as string
  await fs.stat(path.join(AVATARS_DIR, secondFile))

  await ctx.dispose()
})

// ───────────────────────────────────────────────────────────
// DELETE /api/users/me/avatar — clear image
// ───────────────────────────────────────────────────────────

test('DELETE /api/users/me/avatar without auth returns 401', async ({ request }) => {
  const r = await request.delete(`${API}/api/users/me/avatar`)
  expect(r.status()).toBe(401)
})

test('DELETE /api/users/me/avatar clears the image and removes the file', async () => {
  const { ctx } = await newSignedInUser({ name: 'Delete Test' })
  const upload = await ctx.post(`${API}/api/users/me/avatar`, {
    multipart: {
      file: { name: 'me.png', mimeType: 'image/png', buffer: TINY_PNG },
    },
  })
  const body = await upload.json()
  const filename = new URL(body.image as string).pathname
    .split('/')
    .pop() as string

  const del = await ctx.delete(`${API}/api/users/me/avatar`)
  expect(del.status()).toBe(204)

  const me = await ctx.get(`${API}/api/users/me`)
  const meBody = await me.json()
  expect(meBody.image).toBeNull()

  await expect(fs.stat(path.join(AVATARS_DIR, filename))).rejects.toThrow()

  await ctx.dispose()
})

test('DELETE /api/users/me/avatar is idempotent (no image set)', async () => {
  const { ctx } = await newSignedInUser({ name: 'Idem' })
  const del = await ctx.delete(`${API}/api/users/me/avatar`)
  expect(del.status()).toBe(204)
  await ctx.dispose()
})

// ───────────────────────────────────────────────────────────
// /uploads/* static serving
// ───────────────────────────────────────────────────────────

test('GET /uploads/avatars/<missing> returns 404', async ({ request }) => {
  const r = await request.get(`${API}/uploads/avatars/this-does-not-exist.png`)
  expect(r.status()).toBe(404)
})

test('GET /uploads cannot escape the avatars directory', async ({ request }) => {
  const r = await request.get(
    `${API}/uploads/avatars/..%2F..%2Fpackage.json`,
  )
  expect([400, 403, 404]).toContain(r.status())
})
