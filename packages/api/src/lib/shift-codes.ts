/** Коды провала смены (работник виноват в глазах работодателя и наоборот) */
export const WORKER_FAILURE_CODES = [
  'NO_SHOW',
  'LEFT_EARLY',
  'POOR_QUALITY',
  'INTOXICATED',
  'MISCONDUCT',
] as const;
export const EMPLOYER_FAILURE_CODES = [
  'EVENT_CANCELLED',
  'CONDITIONS_CHANGED',
  'REFUSED_PAYMENT',
  'NO_CONTACT',
] as const;
export type WorkerFailureCode = (typeof WORKER_FAILURE_CODES)[number];
export type EmployerFailureCode = (typeof EMPLOYER_FAILURE_CODES)[number];
