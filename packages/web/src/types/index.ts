export type { ApiResponse, ApiError, JwtPayload, NotificationPayload } from '@unity/shared';

export interface VacancyCard {
  id: string;
  title: string;
  category: string;
  rate: number;
  rateType: string;
  employmentType: string;
  dateStart: string;
  address?: string;
  isUrgent: boolean;
  employer: {
    companyName: string;
    logoUrl?: string;
    isVerified: boolean;
  };
  city?: {
    name: string;
  };
}

export interface WorkerCard {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  categories: Array<{ category: string; level: string }>;
  experienceYears: number;
  ratingScore: number;
  totalReviews: number;
  desiredRate?: number;
  rateType?: string;
  isVerified: boolean;
  city?: {
    name: string;
  };
}

export interface EmployerCard {
  id: string;
  slug: string;
  companyName?: string;
  contactName?: string;
  logoUrl?: string;
  businessType: string;
  isVerified: boolean;
  activeVacanciesCount: number;
  city?: {
    name: string;
  };
}
