import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'

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

async function waitForInviteToken(
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
        const m = body.Text?.match(/token=([A-Za-z0-9_-]+)/)
        if (m) return m[1]
      }
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Invite link for ${email} not found within ${timeoutMs}ms`)
}

async function createUserAndSignIn(
  ctx: APIRequestContext,
  opts: { name: string; email: string; role?: 'STUDENT' | 'TEACHER' | 'PARENT' },
) {
  await ctx.post(`${API}/api/auth/register`, {
    data: { name: opts.name, email: opts.email, acceptTerms: true },
  })
  await ctx.post(`${API}/api/auth/email-otp/send-verification-otp`, {
    data: { email: opts.email, type: 'sign-in' },
  })
  const otp = await waitForOtp(ctx, opts.email)
  await ctx.post(`${API}/api/auth/sign-in/email-otp`, {
    data: { email: opts.email, otp },
  })
  if (opts.role) {
    await ctx.patch(`${API}/api/users/me`, { data: { role: opts.role } })
  }
}

test.beforeEach(async ({ request }) => {
  await request.delete(`${MAILPIT}/api/v1/messages`).catch(() => {})
})

// ───────────────────────────────────────────────────────────
// GET /invite/accept — public HTML landing page (deep link redirect)
// ───────────────────────────────────────────────────────────

test('GET /invite/accept renders deep-link redirect HTML for a valid token shape', async ({
  request,
}) => {
  const r = await request.get(
    `${API}/invite/accept?token=cmp0av6nj0003yz1op2if4x1l`,
  )
  expect(r.status()).toBe(200)
  expect(r.headers()['content-type']).toContain('text/html')
  const html = await r.text()
  expect(html).toContain('sillah://invite/accept?token=cmp0av6nj0003yz1op2if4x1l')
  expect(html).toContain('Opening Sillah')
  expect(html).toContain('window.location.replace')
})

test('GET /invite/accept renders an invalid message when token is missing', async ({
  request,
}) => {
  const r = await request.get(`${API}/invite/accept`)
  expect(r.status()).toBe(200)
  const html = await r.text()
  expect(html).toContain('Invitation link invalid')
  expect(html).not.toContain('sillah://')
})

test('GET /invite/accept rejects a malformed token', async ({ request }) => {
  const r = await request.get(`${API}/invite/accept?token=ab`)
  expect(r.status()).toBe(200)
  const html = await r.text()
  expect(html).toContain('Invitation link invalid')
})

test('GET /invite/accept does not allow script injection via token', async ({
  request,
}) => {
  const r = await request.get(
    `${API}/invite/accept?token=${encodeURIComponent('<script>alert(1)</script>')}`,
  )
  const html = await r.text()
  expect(html).not.toContain('<script>alert(1)</script>')
})

// ───────────────────────────────────────────────────────────
// POST /api/students/invite — teacher creates an invitation
// ───────────────────────────────────────────────────────────

test('POST /api/students/invite requires authentication', async ({ request }) => {
  const r = await request.post(`${API}/api/students/invite`, {
    data: { name: 'X', email: `unauth-${Date.now()}@example.com` },
  })
  expect(r.status()).toBe(401)
})

test('POST /api/students/invite requires TEACHER role', async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  const studentEmail = `not-teacher-${Date.now()}@example.com`
  await createUserAndSignIn(ctx, {
    name: 'Stu',
    email: studentEmail,
    role: 'STUDENT',
  })

  const r = await ctx.post(`${API}/api/students/invite`, {
    data: { name: 'X', email: `invitee-${Date.now()}@example.com` },
  })
  expect(r.status()).toBe(403)
  await ctx.dispose()
})

test('TEACHER can invite a student and the email contains a token link', async ({
  playwright,
}) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  const teacherEmail = `teacher-${Date.now()}@example.com`
  await createUserAndSignIn(teacher, {
    name: 'Teacher One',
    email: teacherEmail,
    role: 'TEACHER',
  })

  const inviteeEmail = `invitee-${Date.now()}@example.com`
  const invite = await teacher.post(`${API}/api/students/invite`, {
    data: {
      name: 'Invited Student',
      email: inviteeEmail,
      age: 10,
      level: 'BEGINNER',
    },
  })
  expect(invite.status()).toBe(201)
  const inviteBody = await invite.json()
  expect(inviteBody.student.name).toBe('Invited Student')
  expect(inviteBody.student.status).toBe('INACTIVE')
  expect(inviteBody.student.teacherId).toBeTruthy()
  expect(inviteBody.invitation.status).toBe('PENDING')

  const token = await waitForInviteToken(teacher, inviteeEmail)
  expect(token).toMatch(/^[A-Za-z0-9_-]+$/)

  await teacher.dispose()
})

test('Duplicate invitation by same teacher to same email returns 409', async ({
  playwright,
}) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  await createUserAndSignIn(teacher, {
    name: 'Teach',
    email: `t-dup-${Date.now()}@example.com`,
    role: 'TEACHER',
  })

  const inviteeEmail = `dup-${Date.now()}@example.com`
  const first = await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Stu', email: inviteeEmail },
  })
  expect(first.status()).toBe(201)

  const second = await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Stu', email: inviteeEmail },
  })
  expect(second.status()).toBe(409)
  await teacher.dispose()
})

test('Invite validation: bad email returns 400', async ({ playwright }) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  await createUserAndSignIn(teacher, {
    name: 'T',
    email: `t-val-${Date.now()}@example.com`,
    role: 'TEACHER',
  })

  const r = await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Stu', email: 'not-an-email' },
  })
  expect(r.status()).toBe(400)
  await teacher.dispose()
})

// ───────────────────────────────────────────────────────────
// POST /api/students/invitations/accept — token acceptance
// ───────────────────────────────────────────────────────────

test('Accept invite: invalid token returns 400 INVALID_TOKEN', async ({
  request,
}) => {
  const r = await request.post(
    `${API}/api/students/invitations/accept?token=not-a-real-token-xxxxxxxx`,
    { data: {} },
  )
  expect(r.status()).toBe(400)
  expect((await r.json()).error).toBe('INVALID_TOKEN')
})

test('Accept invite: missing token returns 400', async ({ request }) => {
  const r = await request.post(
    `${API}/api/students/invitations/accept`,
    { data: {} },
  )
  expect(r.status()).toBe(400)
})

test('Accept invite: anonymous + valid token returns probe response', async ({
  playwright,
}) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  await createUserAndSignIn(teacher, {
    name: 'T',
    email: `t-probe-${Date.now()}@example.com`,
    role: 'TEACHER',
  })

  const inviteeEmail = `probe-${Date.now()}@example.com`
  await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Probe Student', email: inviteeEmail },
  })
  const token = await waitForInviteToken(teacher, inviteeEmail)
  await teacher.dispose()

  // Anonymous context (no cookies)
  const anon = await pwRequest.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  const r = await anon.post(
    `${API}/api/students/invitations/accept?token=${token}`,
    { data: {} },
  )
  expect(r.status()).toBe(200)
  const body = await r.json()
  expect(body.valid).toBe(true)
  expect(body.studentName).toBe('Probe Student')
  expect(body.email).toBe(inviteeEmail)
  await anon.dispose()
})

test('Accept invite: TEACHER role is rejected with 403', async ({
  playwright,
}) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  await createUserAndSignIn(teacher, {
    name: 'T',
    email: `t-deny-${Date.now()}@example.com`,
    role: 'TEACHER',
  })
  const inviteeEmail = `deny-${Date.now()}@example.com`
  await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Stu', email: inviteeEmail },
  })
  const token = await waitForInviteToken(teacher, inviteeEmail)

  // Same teacher tries to accept their own invitation
  const r = await teacher.post(
    `${API}/api/students/invitations/accept?token=${token}`,
    { data: {} },
  )
  expect(r.status()).toBe(403)
  await teacher.dispose()
})

test('Accept invite: STUDENT links the user and marks invitation ACCEPTED', async ({
  playwright,
}) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  await createUserAndSignIn(teacher, {
    name: 'T',
    email: `t-link-${Date.now()}@example.com`,
    role: 'TEACHER',
  })
  const inviteeEmail = `link-${Date.now()}@example.com`
  await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Linked Student', email: inviteeEmail, level: 'BEGINNER' },
  })
  const token = await waitForInviteToken(teacher, inviteeEmail)
  await teacher.dispose()

  // Student registers with a DIFFERENT email, then accepts via explicit token.
  const student = await pwRequest.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  const studentEmail = `student-diff-${Date.now()}@example.com`
  await createUserAndSignIn(student, {
    name: 'Different Email Student',
    email: studentEmail,
    role: 'STUDENT',
  })

  const accept = await student.post(
    `${API}/api/students/invitations/accept?token=${token}`,
    { data: {} },
  )
  expect(accept.status()).toBe(200)
  const body = await accept.json()
  expect(body.student.status).toBe('ACTIVE')

  // GET /students/me should now show the teacher relation
  const me = await student.get(`${API}/api/students/me`)
  expect(me.ok()).toBeTruthy()
  const meBody = await me.json()
  expect(meBody.student.name).toBe('Linked Student')
  expect(meBody.student.teacher).toBeTruthy()
  expect(meBody.student.teacher.name).toBe('T')
  await student.dispose()
})

test('Accept invite: re-using an accepted token returns 400 INVALID_TOKEN', async ({
  playwright,
}) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  await createUserAndSignIn(teacher, {
    name: 'T',
    email: `t-reuse-${Date.now()}@example.com`,
    role: 'TEACHER',
  })
  const inviteeEmail = `reuse-${Date.now()}@example.com`
  await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Stu', email: inviteeEmail },
  })
  const token = await waitForInviteToken(teacher, inviteeEmail)
  await teacher.dispose()

  const student = await pwRequest.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  await createUserAndSignIn(student, {
    name: 'S',
    email: `s-reuse-${Date.now()}@example.com`,
    role: 'STUDENT',
  })
  const first = await student.post(
    `${API}/api/students/invitations/accept?token=${token}`,
    { data: {} },
  )
  expect(first.status()).toBe(200)
  const second = await student.post(
    `${API}/api/students/invitations/accept?token=${token}`,
    { data: {} },
  )
  expect(second.status()).toBe(400)
  expect((await second.json()).error).toBe('INVALID_TOKEN')
  await student.dispose()
})

// ───────────────────────────────────────────────────────────
// Role-select auto-link (PATCH /api/users/me with role=STUDENT)
// ───────────────────────────────────────────────────────────

test('Role-select auto-links a pending invitation when emails match', async ({
  playwright,
}) => {
  const teacher = await playwright.request.newContext({
    extraHTTPHeaders: { 'content-type': 'application/json' },
  })
  const teacherEmail = `t-auto-${Date.now()}@example.com`
  await createUserAndSignIn(teacher, {
    name: 'Mrs Mariam',
    email: teacherEmail,
    role: 'TEACHER',
  })
  const inviteeEmail = `auto-match-${Date.now()}@example.com`
  await teacher.post(`${API}/api/students/invite`, {
    data: { name: 'Auto Linked', email: inviteeEmail, level: 'INTERMEDIATE' },
  })
  await waitForInviteToken(teacher, inviteeEmail)

  // Student registers with the SAME email — auto-link should kick in on role select.
  const student = await pwRequest.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  await createUserAndSignIn(student, {
    name: 'Auto Linked',
    email: inviteeEmail,
    role: 'STUDENT',
  })

  const me = await student.get(`${API}/api/students/me`)
  expect(me.ok()).toBeTruthy()
  const meBody = await me.json()
  expect(meBody.student.status).toBe('ACTIVE')
  expect(meBody.student.teacher).toBeTruthy()
  expect(meBody.student.teacher.name).toBe('Mrs Mariam')

  // Teacher should now see this student as ACTIVE in their list
  const list = await teacher.get(`${API}/api/students`)
  const listBody = await list.json()
  const linked = listBody.students.find(
    (s: { email: string }) => s.email === inviteeEmail,
  )
  expect(linked).toBeTruthy()
  expect(linked.status).toBe('ACTIVE')

  await teacher.dispose()
  await student.dispose()
})

test('Self-registered STUDENT (no invitation) gets an unattached profile', async ({
  playwright,
}) => {
  const student = await pwRequest.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  const email = `self-reg-${Date.now()}@example.com`
  await createUserAndSignIn(student, {
    name: 'Self Registered',
    email,
    role: 'STUDENT',
  })

  const me = await student.get(`${API}/api/students/me`)
  expect(me.ok()).toBeTruthy()
  const meBody = await me.json()
  expect(meBody.student.status).toBe('ACTIVE')
  expect(meBody.student.teacher).toBeNull()
  expect(meBody.student.teacherId).toBeNull()

  await student.dispose()
})

// ───────────────────────────────────────────────────────────
// Cross-teacher isolation
// ───────────────────────────────────────────────────────────

test("Teachers cannot see or modify each other's students", async ({
  playwright,
}) => {
  const teacherA = await playwright.request.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  await createUserAndSignIn(teacherA, {
    name: 'A',
    email: `ta-${Date.now()}@example.com`,
    role: 'TEACHER',
  })
  const inviteAEmail = `a-only-${Date.now()}@example.com`
  const createA = await teacherA.post(`${API}/api/students/invite`, {
    data: { name: 'A only', email: inviteAEmail },
  })
  const studentA = (await createA.json()).student

  const teacherB = await playwright.request.newContext({ extraHTTPHeaders: { 'content-type': 'application/json' } })
  await createUserAndSignIn(teacherB, {
    name: 'B',
    email: `tb-${Date.now()}@example.com`,
    role: 'TEACHER',
  })

  // B's list should not contain A's student
  const list = await teacherB.get(`${API}/api/students`)
  const listBody = await list.json()
  const found = listBody.students.find(
    (s: { id: string }) => s.id === studentA.id,
  )
  expect(found).toBeUndefined()

  // B cannot fetch A's student detail
  const detail = await teacherB.get(`${API}/api/students/${studentA.id}`)
  expect(detail.status()).toBe(403)

  // B cannot delete A's student
  const del = await teacherB.delete(`${API}/api/students/${studentA.id}`)
  expect(del.status()).toBe(403)

  await teacherA.dispose()
  await teacherB.dispose()
})
