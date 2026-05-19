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

export const employerStaffSearchFiltersSchema = z.object({
  category: z.union([z.string(), z.array(z.string())]).optional(),
  cityId: z.string().optional(),
  search: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minExperience: z.coerce.number().min(0).max(50).optional(),
  verified: z.coerce.boolean().optional(),
  readyForTrips: z.coerce.boolean().optional(),
  readyForOvertime: z.coerce.boolean().optional(),
  availability: z.enum(['available', 'all']).optional(),
  sort: z
    .enum(['rating', 'experience', 'newest', 'price_asc', 'price_desc'])
    .default('rating'),
  page: z.coerce.number().default(1),
  perPage: z.coerce.number().default(20),
});

export type EmployerStaffSearchFilters = z.infer<typeof employerStaffSearchFiltersSchema>;

const employerShiftTabs = [
  'active',
  'pending_confirm',
  'completed',
  'needs_payment',
  'archive',
  'disputed',
  'all',
] as const;

export const employerShiftsFiltersSchema = z.object({
  tab: z.enum(employerShiftTabs).default('active'),
  page: z.coerce.number().default(1),
  perPage: z.coerce.number().default(20),
  vacancyId: z.string().optional(),
  workerSearch: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type EmployerShiftsFilters = z.infer<typeof employerShiftsFiltersSchema>;
