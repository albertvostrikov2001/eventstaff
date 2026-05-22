import type { Prisma } from '@prisma/client';

/** Safe User fields for API responses — passwordHash is never included. */
export const safeUserSelect = {
  id: true,
  email: true,
  phone: true,
  emailVerified: true,
  phoneVerified: true,
  status: true,
  activeRole: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

export const safeUserInclude = {
  select: safeUserSelect,
} as const;

/** Internal auth queries — includes passwordHash; never return to clients. */
export const authUserSelect = {
  ...safeUserSelect,
  passwordHash: true,
} as const satisfies Prisma.UserSelect;

export const safeUserWithRolesSelect = {
  ...safeUserSelect,
  roles: true,
} as const satisfies Prisma.UserSelect;

export const authUserWithRolesSelect = {
  ...authUserSelect,
  roles: true,
} as const satisfies Prisma.UserSelect;
