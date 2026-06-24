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
    // Тип работодателя: компания/организация или частное лицо (физлицо).
    // Учитывается только при role === 'employer'.
    employerType: z.enum(['company', 'individual']).optional(),
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

const CATEGORY_ENUM = [
  'waiter',
  'bartender',
  'cook',
  'administrator',
  'coordinator',
  'technical',
  'banquet_manager',
  'dj',
  'barista',
  'sommelier',
  'hostess',
  'cleaner',
  'other',
] as const;

export const vacancyTagListSchema = z.array(z.string().trim().min(1).max(40)).max(25).optional();

export const vacancyWritableFieldsSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(CATEGORY_ENUM),
  specialization: z.string().max(100).optional(),
  eventType: z.enum([
    'wedding',
    'corporate',
    'banquet',
    'conference',
    'festival',
    'private_party',
    'birthday',
    'catering_event',
    'other',
  ]).optional(),
  venueLevel: z.number().int().min(1).max(5).optional(),
  rate: z.number().positive('Ставка должна быть положительной'),
  rateType: z.enum(['hourly', 'per_shift', 'fixed', 'daily', 'weekly', 'after_event', 'monthly']),
  employmentType: z.enum(['single_shift', 'series', 'permanent', 'part_time', 'project']),
  dateStart: z.string().datetime({ message: 'Укажите корректную дату начала' }),
  dateEnd: z.string().datetime().optional().or(z.literal('')),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  address: z.string().min(1, 'Укажите адрес места проведения').max(500),
  workersNeeded: z.number().int().positive().default(1),
  dressCode: z.string().max(200).optional(),
  experienceRequired: z.number().int().min(0).optional(),
  responsibilities: z.string().max(5000).optional(),
  requirements: z.string().max(5000).optional(),
  conditions: z.string().max(5000).optional(),
  description: z.string().max(2000).optional(),
  foodProvided: z.boolean().default(false),
  transportProvided: z.boolean().default(false),
  tipsPossible: z.boolean().optional(),
  isUrgent: z.boolean().default(false),
  cityId: z.string().optional(),
  coverImageUrl: z.union([z.string().url('Нужен корректный URL'), z.literal('')]).optional(),
  tags: vacancyTagListSchema,
});

const ONE_H_MS = 60 * 60 * 1000;

function vacancyRefineDateRange(data: z.infer<typeof vacancyWritableFieldsSchema>, ctx: z.RefinementCtx) {
  const startMs = Date.parse(data.dateStart);
  const endRaw = data.dateEnd && data.dateEnd !== '' ? Date.parse(data.dateEnd) : NaN;
  if (!Number.isFinite(startMs)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dateStart'], message: 'Укажите дату начала' });
    return;
  }
  if (Number.isFinite(endRaw)) {
    if (endRaw <= startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateEnd'],
        message: 'Дата окончания должна быть позже начала',
      });
    }
  }
}

/** Поля формы (без статуса публикации) */
export const vacancyFormFieldsSchema =
  vacancyWritableFieldsSchema.superRefine(vacancyRefineDateRange);

export const vacancyCreateSchema = vacancyWritableFieldsSchema
  .extend({
    status: z.enum(['draft', 'active', 'paused']).default('draft'),
  })
  .superRefine((data, ctx) => {
    vacancyRefineDateRange(data, ctx);
    const publishing = data.status === 'active';
    if (!publishing) return;

    const startMs = Date.parse(data.dateStart);
    if (!Number.isFinite(startMs)) return;

    if (data.title.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['title'], message: 'Минимум 5 символов' });
    }

    const desc = data.description?.trim() ?? '';
    if (desc.length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Описание: минимум 20 символов для публикации',
      });
    }

    if (!data.cityId?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cityId'], message: 'Выберите город' });
    }

    if (startMs < Date.now() + ONE_H_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateStart'],
        message: 'Дата начала должна быть не раньше чем через 1 час',
      });
    }
  });

/** PATCH/PUT полей (проверка active после merge в API) */
export const vacancyMutationPartialSchema = vacancyWritableFieldsSchema.partial();

export type VacancyMutationPartialInput = z.infer<typeof vacancyMutationPartialSchema>;

/** PUT работодателя: поля вакансии + опциональная смена статуса */
export const employerVacancyPutBodySchema = vacancyMutationPartialSchema.extend({
  status: z.enum(['draft', 'active', 'paused']).optional(),
});

export type EmployerVacancyPutBody = z.infer<typeof employerVacancyPutBodySchema>;

/** Список вакансий работодателя (табы + фильтры) */
export const employerVacancyListQuerySchema = z.object({
  tab: z.enum(['live', 'archived']).default('live'),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
  /** Только для tab live: один из статусов или «все» (active + paused + draft) */
  vacancyStatus: z.enum(['draft', 'active', 'paused', 'all']).optional(),
  sort: z.enum(['newest', 'oldest', 'startAt']).default('newest'),
});

export type EmployerVacancyListQuery = z.infer<typeof employerVacancyListQuerySchema>;

export const workerProfileUpdateSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  age: z.number().int().min(18).max(99).optional(),
  bio: z.string().max(2000).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
  hasMedicalBook: z.boolean().optional(),
  desiredRate: z.number().positive().optional(),
  rateType: z.enum(['hourly', 'per_shift', 'fixed', 'daily', 'weekly', 'after_event', 'monthly']).optional(),
  willingToTravel: z.boolean().optional(),
  overtimeReady: z.boolean().optional(),
  visibility: z.enum(['public', 'verified_only', 'hidden', 'invite_only']).optional(),
  cityId: z.string().optional(),
  languages: z.array(z.string()).optional(),
  dressSizes: z.string().optional(),
  readyForTrips: z.boolean().optional(),
  readyForOvertime: z.boolean().optional(),
});

/** Профиль компании (работодатель): строгая валидация для кабинета + API PUT /employer/profile */
export const employerProfileUpdateSchema = z.object({
  type: z.enum(['company', 'individual']).optional(),
  companyName: z.string().trim().min(2, 'Укажите название компании').max(200),
  inn: z
    .string()
    .optional()
    .transform((v) => (v ?? '').replace(/\D/g, ''))
    .refine((digits) => digits === '' || digits.length === 10 || digits.length === 12, {
      message: 'ИНН: 10 или 12 цифр',
    }),
  contactFirstName: z.string().trim().min(1, 'Укажите имя').max(100),
  contactLastName: z.string().trim().min(1, 'Укажите фамилию').max(100),
  contactJobTitle: z.string().trim().max(150).optional(),
  phone: phoneSchema,
  email: emailSchema,
  website: z
    .string()
    .trim()
    .refine((val) => val === '' || /^https?:\/\/.+/i.test(val), {
      message: 'Введите корректный URL (с https://)',
    }),
  businessType: z.enum(['restaurant', 'catering', 'event_agency', 'hotel', 'other']),
  cityId: z.string().trim().min(1, 'Выберите город'),
  description: z.string().max(1000).optional(),
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
