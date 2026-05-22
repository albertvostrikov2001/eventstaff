/**
 * Zod-схемы для форм кабинета работодателя (клиент).
 * Сообщения об ошибках задаются в `@unity/shared`; здесь — алиасы под названия ТЗ.
 */
export {
  vacancyCreateSchema as VacancyCreateSchema,
  employerProfileUpdateSchema as CompanyProfileSchema,
} from '@unity/shared';

/** Поля формы без логики «публикация» (черновик). */
export { vacancyFormFieldsSchema as VacancyDraftFieldsSchema } from '@unity/shared';

/** Тот же контракт, что создание; отличия времени старта учитываются на сервере при PATCH. */
export { vacancyCreateSchema as VacancyEditSchema } from '@unity/shared';

export type { VacancyCreateInput, EmployerProfileUpdateInput } from '@unity/shared';

export type CompanyProfileInput = import('@unity/shared').EmployerProfileUpdateInput;
