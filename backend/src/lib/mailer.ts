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
