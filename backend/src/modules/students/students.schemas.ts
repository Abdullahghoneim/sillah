import { z } from 'zod'

export const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
export type StudentLevel = (typeof LEVELS)[number]

export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type StudentStatusValue = (typeof STUDENT_STATUSES)[number]

export const AGE_FILTERS = ['under8', '8-12', 'over12'] as const
export type AgeFilter = (typeof AGE_FILTERS)[number]

export const inviteStudentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email().toLowerCase().trim(),
  age: z.coerce.number().int().min(4).max(18).optional(),
  level: z.enum(LEVELS).default('BEGINNER'),
  parentEmail: z.string().email().toLowerCase().trim().optional(),
})

export const updateStudentSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    age: z.coerce.number().int().min(4).max(18).nullable().optional(),
    level: z.enum(LEVELS).optional(),
    status: z.enum(STUDENT_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export const listStudentsQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  age: z.enum(AGE_FILTERS).optional(),
  level: z.enum(LEVELS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(7),
})

export const acceptInviteQuerySchema = z.object({
  token: z.string().min(1, 'Missing invitation token'),
})

export type InviteStudentInput = z.infer<typeof inviteStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>
