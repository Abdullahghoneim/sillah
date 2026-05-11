import { z } from 'zod'

export const ROLES = ['STUDENT', 'TEACHER', 'PARENT'] as const
export type Role = (typeof ROLES)[number]

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().toLowerCase().trim(),
  phone: z
    .string()
    .trim()
    .min(5)
    .max(20)
    .regex(/^[+\d][\d\s\-()]*$/, 'Invalid phone number')
    .optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({
      message: 'You must accept the Terms and Privacy Policy',
    }),
  }),
})

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z
      .string()
      .trim()
      .min(5)
      .max(20)
      .regex(/^[+\d][\d\s\-()]*$/, 'Invalid phone number')
      .optional(),
    role: z.enum(ROLES).optional(),
    image: z.string().url().max(2048).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
