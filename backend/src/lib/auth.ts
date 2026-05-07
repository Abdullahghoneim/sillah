import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP } from 'better-auth/plugins'
import { expo } from '@better-auth/expo'
import { prisma } from './prisma'
import { env } from '../config/env'
import { sendOtpEmail } from './mailer'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
        input: true,
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'STUDENT',
        input: true,
      },
    },
  },
  trustedOrigins: [
    'sillah://',
    'http://localhost:8081',
    'http://localhost:3000',
  ],
  plugins: [
    emailOTP({
      disableSignUp: true,
      sendVerificationOnSignUp: false,
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type)
      },
    }),
    expo(),
  ],
})
