import { test, expect, APIRequestContext } from '@playwright/test'

const API = 'http://localhost:3000'
const MAILPIT = 'http://localhost:8025'

async function waitForOtp(
  ctx: APIRequestContext,
  email: string,
  timeoutMs = 10_000,
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

test.beforeEach(async ({ request }) => {
  await request.delete(`${MAILPIT}/api/v1/messages`).catch(() => {})
})

test('full signup flow: register → OTP → sign-in → role → me', async ({
  request,
}) => {
  const email = `user-${Date.now()}@example.com`

  const reg = await request.post(`${API}/api/auth/register`, {
    data: {
      name: 'Ehsan Mohamed',
      email,
      phone: '01062067188',
      acceptTerms: true,
    },
  })
  expect(reg.status()).toBe(201)
  const regBody = await reg.json()
  expect(regBody.user.email).toBe(email)
  expect(regBody.user.name).toBe('Ehsan Mohamed')
  expect(regBody.user.phone).toBe('01062067188')
  expect(regBody.user.role).toBe('STUDENT')
  expect(regBody.user.emailVerified).toBe(false)
  expect(regBody.otpRequired).toBe(true)

  const send = await request.post(
    `${API}/api/auth/email-otp/send-verification-otp`,
    { data: { email, type: 'sign-in' } },
  )
  expect(send.ok()).toBeTruthy()

  const otp = await waitForOtp(request, email)
  expect(otp).toMatch(/^\d{6}$/)

  const signin = await request.post(`${API}/api/auth/sign-in/email-otp`, {
    data: { email, otp },
  })
  expect(signin.ok()).toBeTruthy()

  const patch = await request.patch(`${API}/api/users/me`, {
    data: { role: 'TEACHER' },
  })
  expect(patch.ok()).toBeTruthy()
  expect((await patch.json()).role).toBe('TEACHER')

  const me = await request.get(`${API}/api/users/me`)
  expect(me.ok()).toBeTruthy()
  const meBody = await me.json()
  expect(meBody.email).toBe(email)
  expect(meBody.role).toBe('TEACHER')
  expect(meBody.phone).toBe('01062067188')
})

test('login flow for existing user uses same OTP endpoint', async ({
  request,
}) => {
  const email = `login-${Date.now()}@example.com`

  await request.post(`${API}/api/auth/register`, {
    data: { name: 'Login User', email, acceptTerms: true },
  })

  const send = await request.post(
    `${API}/api/auth/email-otp/send-verification-otp`,
    { data: { email, type: 'sign-in' } },
  )
  expect(send.ok()).toBeTruthy()

  const otp = await waitForOtp(request, email)
  const signin = await request.post(`${API}/api/auth/sign-in/email-otp`, {
    data: { email, otp },
  })
  expect(signin.ok()).toBeTruthy()

  const me = await request.get(`${API}/api/users/me`)
  expect(me.ok()).toBeTruthy()
  expect((await me.json()).email).toBe(email)
})

test('duplicate email registration returns 409', async ({ request }) => {
  const email = `dup-${Date.now()}@example.com`
  const first = await request.post(`${API}/api/auth/register`, {
    data: { name: 'First', email, acceptTerms: true },
  })
  expect(first.status()).toBe(201)

  const second = await request.post(`${API}/api/auth/register`, {
    data: { name: 'Second', email, acceptTerms: true },
  })
  expect(second.status()).toBe(409)
})

test('register validation: missing acceptTerms returns 400', async ({
  request,
}) => {
  const r = await request.post(`${API}/api/auth/register`, {
    data: { name: 'NoTerms', email: `nt-${Date.now()}@example.com` },
  })
  expect(r.status()).toBe(400)
  const body = await r.json()
  expect(body.error).toBe('ValidationError')
})

test('register validation: invalid email returns 400', async ({ request }) => {
  const r = await request.post(`${API}/api/auth/register`, {
    data: { name: 'Bad', email: 'not-an-email', acceptTerms: true },
  })
  expect(r.status()).toBe(400)
})

test('login OTP for unknown email is silently dropped (anti-enumeration)', async ({
  request,
}) => {
  const unknown = `nobody-${Date.now()}@example.com`
  // Better Auth intentionally returns 200 for unknown emails so attackers can't
  // enumerate accounts. The real guarantee is that no OTP is delivered.
  const r = await request.post(
    `${API}/api/auth/email-otp/send-verification-otp`,
    { data: { email: unknown, type: 'sign-in' } },
  )
  expect(r.ok()).toBeTruthy()

  await new Promise((r) => setTimeout(r, 1000))
  const search = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${unknown}`)}`,
  )
  const data = (await search.json()) as { messages?: unknown[] }
  expect(data.messages?.length ?? 0).toBe(0)
})

test('GET /api/users/me without session returns 401', async ({ request }) => {
  const r = await request.get(`${API}/api/users/me`)
  expect(r.status()).toBe(401)
})

test('PATCH /api/users/me without session returns 401', async ({ request }) => {
  const r = await request.patch(`${API}/api/users/me`, {
    data: { role: 'TEACHER' },
  })
  expect(r.status()).toBe(401)
})

test('PATCH /api/users/me rejects invalid role', async ({ request }) => {
  const email = `bad-role-${Date.now()}@example.com`
  await request.post(`${API}/api/auth/register`, {
    data: { name: 'X', email, acceptTerms: true },
  })
  await request.post(`${API}/api/auth/email-otp/send-verification-otp`, {
    data: { email, type: 'sign-in' },
  })
  const otp = await waitForOtp(request, email)
  await request.post(`${API}/api/auth/sign-in/email-otp`, {
    data: { email, otp },
  })

  const r = await request.patch(`${API}/api/users/me`, {
    data: { role: 'ADMIN' },
  })
  expect(r.status()).toBe(400)
})
