'use client';

import { useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { useAuthStore, type AuthUser } from '@/stores/authStore';

const EVENT_TYPES = [
  { value: 'Свадьба', label: 'Свадьба' },
  { value: 'Корпоратив', label: 'Корпоратив' },
  { value: 'Банкет', label: 'Банкет' },
  { value: 'Открытие', label: 'Открытие' },
  { value: 'Фестиваль', label: 'Фестиваль' },
  { value: 'Другое', label: 'Другое' },
] as const;

const employerRequestFormSchema = z
  .object({
    companyName: z.string().trim().min(1, 'Укажите компанию'),
    firstName: z.string().trim().min(1, 'Укажите имя'),
    lastName: z.string().trim().min(1, 'Укажите фамилию'),
    phone: z
      .string()
      .trim()
      .regex(/^\+7\d{10}$/, 'Формат: +7 и 10 цифр'),
    email: z.string().trim().email('Некорректный email'),
    eventType: z.string().min(1, 'Выберите тип мероприятия'),
    eventDate: z.string().optional(),
    staffNeeded: z.string().trim().min(1, 'Опишите, какой персонал нужен'),
    quantity: z.string().optional(),
    comment: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const composed = [val.staffNeeded, val.comment?.trim()].filter(Boolean).join('\n\n');
    if (composed.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Суммарно не менее 10 символов в блоке про персонал и комментарии',
        path: ['staffNeeded'],
      });
    }
    if (val.eventDate?.trim()) {
      const d = new Date(val.eventDate);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Некорректная дата', path: ['eventDate'] });
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cmp = new Date(d);
      cmp.setHours(0, 0, 0, 0);
      if (cmp < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Дата не может быть в прошлом',
          path: ['eventDate'],
        });
      }
    }
  });

export type EmployerIndividualRequestForm = z.infer<typeof employerRequestFormSchema>;

function defaultsFromUser(user: AuthUser | null): EmployerIndividualRequestForm {
  const contact = user?.employerProfile?.contactName?.trim() || '';
  const parts = contact.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  return {
    companyName: user?.employerProfile?.companyName?.trim() || '',
    firstName,
    lastName,
    phone: user?.phone?.trim() || '',
    email: user?.email?.trim() || '',
    eventType: 'Корпоратив',
    eventDate: '',
    staffNeeded: '',
    quantity: '',
    comment: '',
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EmployerIndividualRequestModal({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const form = useForm<EmployerIndividualRequestForm>({
    resolver: zodResolver(employerRequestFormSchema),
    defaultValues: defaultsFromUser(user),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultsFromUser(useAuthStore.getState().user));
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiClient.post('/individual-requests', {
        role: 'employer',
        name: `${values.firstName} ${values.lastName}`.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        company: values.companyName.trim(),
        companyName: values.companyName.trim(),
        eventType: values.eventType,
        eventDate: values.eventDate?.trim() ? values.eventDate : undefined,
        staffNeeded: values.staffNeeded.trim(),
        quantity:
          values.quantity?.trim() && !Number.isNaN(Number(values.quantity))
            ? Number(values.quantity)
            : undefined,
        message: values.comment?.trim() || '',
      });
      toast('Запрос отправлен. Мы свяжемся с вами в течение 24 часов', 'success');
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        toast('Сессия истекла. Войдите снова.', 'error');
        onOpenChange(false);
        router.push('/auth/login');
        return;
      }
      toast(e instanceof ApiError ? e.message : 'Не удалось отправить запрос', 'error');
    }
  });

  const submitting = form.formState.isSubmitting;

  const fieldClass =
    'mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-500/50';

  const labelClass = 'text-xs font-medium text-white/60';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[100] animate-fade-in data-[state=open]:animate-fade-in backdrop-blur-[8px]',
          )}
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
            'p-4 outline-none animate-fade-in data-[state=open]:animate-fade-in md:p-8',
          )}
          style={{
            background: 'rgba(13, 31, 23, 0.98)',
            borderRadius: 16,
            maxWidth: 560,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}
          aria-describedby={undefined}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-semibold text-white">
                Персональный подбор персонала
              </DialogPrimitive.Title>
              <p className="mt-2 text-sm text-white/55">Мы свяжемся с вами в течение 24 часов</p>
            </div>
            <DialogPrimitive.Close
              type="button"
              className="rounded-lg p-1.5 text-white/50 outline-none hover:bg-white/10 hover:text-white"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Название компании *</label>
              <input className={fieldClass} {...form.register('companyName')} autoComplete="organization" />
              {form.formState.errors.companyName?.message && (
                <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.companyName.message)}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Имя *</label>
                <input className={fieldClass} {...form.register('firstName')} />
                {form.formState.errors.firstName?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.firstName.message)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Фамилия *</label>
                <input className={fieldClass} {...form.register('lastName')} />
                {form.formState.errors.lastName?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.lastName.message)}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Телефон *</label>
                <input
                  className={fieldClass}
                  {...form.register('phone')}
                  placeholder="+79991234567"
                  autoComplete="tel"
                />
                {form.formState.errors.phone?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.phone.message)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input className={fieldClass} type="email" {...form.register('email')} autoComplete="email" />
                {form.formState.errors.email?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.email.message)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Тип мероприятия *</label>
                <select className={`${fieldClass} cursor-pointer appearance-none bg-white/[0.07]`} {...form.register('eventType')}>
                  {EVENT_TYPES.map((x) => (
                    <option key={x.value} value={x.value} className="bg-[#0d1f17] text-white">
                      {x.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.eventType?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.eventType.message)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Дата мероприятия</label>
                <input className={`${fieldClass} [color-scheme:dark]`} type="date" {...form.register('eventDate')} />
                {form.formState.errors.eventDate?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.eventDate.message)}</p>
                )}
              </div>
            </div>

            <div>
              <label className={labelClass}>Какой персонал нужен *</label>
              <textarea className={`${fieldClass} min-h-[92px]`} rows={3} {...form.register('staffNeeded')} />
              {form.formState.errors.staffNeeded?.message && (
                <p className="mt-1 text-xs text-red-300">{String(form.formState.errors.staffNeeded.message)}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Количество человек</label>
              <input className={fieldClass} inputMode="numeric" {...form.register('quantity')} />
            </div>
            <div>
              <label className={labelClass}>Комментарий</label>
              <textarea className={`${fieldClass} min-h-[76px]`} rows={2} {...form.register('comment')} />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                className={cn(
                  'rounded-xl px-5 py-2.5 text-sm font-medium transition',
                  'border border-transparent text-white/80 hover:bg-white/10 hover:text-white',
                  submitting && 'pointer-events-none opacity-50',
                )}
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'rounded-xl px-6 py-2.5 text-sm font-semibold text-gray-950',
                  submitting && 'opacity-70',
                  'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 shadow-lg shadow-black/35 transition hover:brightness-105 disabled:opacity-60',
                )}
              >
                {submitting ? 'Отправляем…' : 'Отправить запрос'}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
