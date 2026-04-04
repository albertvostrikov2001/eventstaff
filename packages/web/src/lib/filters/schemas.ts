import { z } from 'zod';

export const workerFilterSchema = z.object({
  category: z.union([z.string(), z.array(z.string())]).optional(),
  cityId: z.string().optional(),
  rateMin: z.coerce.number().optional(),
  rateMax: z.coerce.number().optional(),
  experience: z.coerce.number().optional(),
  hasMedicalBook: z.coerce.boolean().optional(),
  willingToTravel: z.coerce.boolean().optional(),
  sortBy: z.enum(['rating', 'rate', 'experience', 'createdAt']).default('rating'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
});

export type WorkerFilter = z.infer<typeof workerFilterSchema>;

export const vacancyFilterSchema = z.object({
  category: z.union([z.string(), z.array(z.string())]).optional(),
  cityId: z.string().optional(),
  rateMin: z.coerce.number().optional(),
  rateMax: z.coerce.number().optional(),
  eventType: z.union([z.string(), z.array(z.string())]).optional(),
  employmentType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['date', 'rate', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
});

export type VacancyFilter = z.infer<typeof vacancyFilterSchema>;

export const employerFilterSchema = z.object({
  businessType: z.string().optional(),
  cityId: z.string().optional(),
  isVerified: z.coerce.boolean().optional(),
  sortBy: z.enum(['rating', 'createdAt']).default('rating'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
});

export type EmployerFilter = z.infer<typeof employerFilterSchema>;
