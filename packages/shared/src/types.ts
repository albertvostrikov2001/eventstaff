export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  error?: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  roles: string[];
  activeRole: string;
  iat: number;
  exp: number;
}

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

export type StaffCategoryKey =
  | 'waiter' | 'bartender' | 'cook' | 'administrator'
  | 'coordinator' | 'technical' | 'hookah_master' | 'banquet_manager'
  | 'dj' | 'barista' | 'sommelier' | 'hostess' | 'cleaner' | 'other';

export type EventTypeKey =
  | 'wedding' | 'corporate' | 'banquet' | 'conference' | 'festival'
  | 'private_party' | 'birthday' | 'catering_event' | 'other';

export type RoleKey = 'worker' | 'employer' | 'admin' | 'moderator';

export type ApplicationStatusKey =
  | 'pending' | 'viewed' | 'invited' | 'interview'
  | 'confirmed' | 'shift_started' | 'completed'
  | 'cancelled' | 'rejected';

export type VacancyStatusKey =
  | 'draft' | 'pending_moderation' | 'active'
  | 'closed' | 'archived' | 'rejected';
