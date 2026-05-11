import nodemailer from 'nodemailer'
import { env } from '../config/env'

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
})

export type OtpType = 'sign-in' | 'email-verification' | 'forget-password'

const SUBJECTS: Record<OtpType, string> = {
  'sign-in': 'Your Sillah sign-in code',
  'email-verification': 'Verify your Sillah email',
  'forget-password': 'Reset your Sillah password',
}

export async function sendOtpEmail(to: string, otp: string, type: OtpType) {
  await mailer.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: SUBJECTS[type],
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
  })
}

export async function sendStudentInvitationEmail(opts: {
  to: string
  studentName: string
  teacherName: string
  token: string
  expiresAt: Date
}) {
  const link = `${env.APP_URL}/invite/accept?token=${opts.token}`
  await mailer.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: "You've been invited to learn Arabic on Sillah",
    text: [
      `Hi ${opts.studentName},`,
      '',
      `${opts.teacherName} has invited you to learn Arabic on Sillah.`,
      '',
      `Tap the link below to accept the invitation and get started:`,
      link,
      '',
      `This invitation expires on ${opts.expiresAt.toLocaleDateString()}.`,
      '',
      `If you didn't expect this email, you can safely ignore it.`,
    ].join('\n'),
  })
}
