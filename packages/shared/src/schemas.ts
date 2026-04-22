import { z } from 'zod';

export const emailSchema = z.string().email('Некорректный email');
export const phoneSchema = z.string().regex(/^\+7\d{10}$/, 'Формат: +7XXXXXXXXXX');
export const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .max(128, 'Максимум 128 символов');

export const registerSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
    role: z.enum(['worker', 'employer']),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо согласие на обработку данных' }),
    }),
    isAdult: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо подтвердить возраст 18+' }),
    }),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Укажите email или телефон',
  });

export const loginSchema = z.object({
  login: z.string().min(1, 'Укажите email или телефон'),
  password: passwordSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Код должен содержать 6 цифр'),
});

export const vacancyCreateSchema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').max(200),
  category: z.enum([
    'waiter', 'bartender', 'cook', 'administrator', 'coordinator',
    'technical', 'hookah_master', 'banquet_manager', 'dj', 'barista',
    'sommelier', 'hostess', 'cleaner', 'other',
  ]),
  specialization: z.string().max(100).optional(),
  eventType: z.enum([
    'wedding', 'corporate', 'banquet', 'conference', 'festival',
    'private_party', 'birthday', 'catering_event', 'other',
  ]).optional(),
  venueLevel: z.number().int().min(1).max(5).optional(),
  rate: z.number().positive('Ставка должна быть положительной'),
  rateType: z.enum(['hourly', 'per_shift', 'fixed', 'daily', 'weekly', 'after_event']),
  employmentType: z.enum(['single_shift', 'series', 'permanent', 'part_time', 'project']),
  dateStart: z.string().datetime(),
  dateEnd: z.string().datetime().optional(),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  address: z.string().max(500).optional(),
  workersNeeded: z.number().int().positive().default(1),
  dressCode: z.string().max(200).optional(),
  experienceRequired: z.number().int().min(0).optional(),
  responsibilities: z.string().max(5000).optional(),
  requirements: z.string().max(5000).optional(),
  conditions: z.string().max(5000).optional(),
  description: z.string().max(5000).optional(),
  foodProvided: z.boolean().default(false),
  transportProvided: z.boolean().default(false),
  tipsPossible: z.boolean().optional(),
  isUrgent: z.boolean().default(false),
  cityId: z.string().optional(),
});

export const workerProfileUpdateSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  age: z.number().int().min(18).max(99).optional(),
  bio: z.string().max(2000).optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  hasMedicalBook: z.boolean().optional(),
  desiredRate: z.number().positive().optional(),
  rateType: z.enum(['hourly', 'per_shift', 'fixed', 'daily', 'weekly', 'after_event']).optional(),
  willingToTravel: z.boolean().optional(),
  overtimeReady: z.boolean().optional(),
  visibility: z.enum(['public', 'verified_only', 'hidden', 'invite_only']).optional(),
  cityId: z.string().optional(),
  languages: z.array(z.string()).optional(),
  dressSizes: z.string().optional(),
  readyForTrips: z.boolean().optional(),
  readyForOvertime: z.boolean().optional(),
});

export const employerProfileUpdateSchema = z.object({
  type: z.enum(['company', 'individual']).optional(),
  companyName: z.string().min(2).max(200).optional(),
  contactName: z.string().min(2).max(100).optional(),
  description: z.string().max(5000).optional(),
  businessType: z.enum([
    'restaurant', 'catering', 'event_agency', 'banquet_hall',
    'individual', 'hotel', 'conference', 'other',
  ]).optional(),
  website: z.string().url().optional().or(z.literal('')),
  cityId: z.string().optional(),
});

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

export const reportCreateSchema = z.object({
  targetType: z.enum(['user', 'vacancy', 'message', 'review']),
  targetId: z.string(),
  category: z.enum(['spam', 'abuse', 'fraud', 'inappropriate_content', 'other']),
  description: z.string().max(2000).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  cityId: z.string().optional(),
  rateMin: z.coerce.number().optional(),
  rateMax: z.coerce.number().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  readyForTrips: z.coerce.boolean().optional(),
  readyForOvertime: z.coerce.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VacancyCreateInput = z.infer<typeof vacancyCreateSchema>;
export type WorkerProfileUpdateInput = z.infer<typeof workerProfileUpdateSchema>;
export type EmployerProfileUpdateInput = z.infer<typeof employerProfileUpdateSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
