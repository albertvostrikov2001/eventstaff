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

// ── Employer schema ──────────────────────────────────────────────────────────
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

// ── Worker schema ────────────────────────────────────────────────────────────
const workerRequestFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Укажите имя'),
  lastName: z.string().trim().min(1, 'Укажите фамилию'),
  phone: z.string().trim().min(5, 'Укажите телефон').max(40),
  email: z.string().trim().email('Некорректный email'),
  position: z.string().trim().min(1, 'Укажите желаемую должность'),
  experience: z.string().trim().min(10, 'Опишите опыт (минимум 10 символов)'),
  message: z.string().trim().max(4000).optional(),
});

type WorkerIndividualRequestForm = z.infer<typeof workerRequestFormSchema>;

// ── Default values ───────────────────────────────────────────────────────────
function employerDefaultsFromUser(user: AuthUser | null): EmployerIndividualRequestForm {
  const contact = user?.employerProfile?.contactName?.trim() || '';
  const parts = contact.split(/\s+/).filter(Boolean);
  return {
    companyName: user?.employerProfile?.companyName?.trim() || '',
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
    phone: user?.phone?.trim() || '',
    email: user?.email?.trim() || '',
    eventType: 'Корпоратив',
    eventDate: '',
    staffNeeded: '',
    quantity: '',
    comment: '',
  };
}

function workerDefaultsFromUser(user: AuthUser | null): WorkerIndividualRequestForm {
  return {
    firstName: user?.workerProfile?.firstName?.trim() || '',
    lastName: user?.workerProfile?.lastName?.trim() || '',
    phone: user?.phone?.trim() || '',
    email: user?.email?.trim() || '',
    position: '',
    experience: '',
    message: '',
  };
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  role?: 'employer' | 'worker';
}

// ── Component ────────────────────────────────────────────────────────────────
export function EmployerIndividualRequestModal({
  open,
  onOpenChange,
  onSuccess,
  role = 'employer',
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const fieldClass =
    'mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-500/50';
  const labelClass = 'text-xs font-medium text-white/60';

  // ── Employer form ──────────────────────────────────────────────────────────
  const employerForm = useForm<EmployerIndividualRequestForm>({
    resolver: zodResolver(employerRequestFormSchema),
    defaultValues: employerDefaultsFromUser(user),
  });

  // ── Worker form ────────────────────────────────────────────────────────────
  const workerForm = useForm<WorkerIndividualRequestForm>({
    resolver: zodResolver(workerRequestFormSchema),
    defaultValues: workerDefaultsFromUser(user),
  });

  useEffect(() => {
    if (open) {
      if (role === 'employer') {
        employerForm.reset(employerDefaultsFromUser(useAuthStore.getState().user));
      } else {
        workerForm.reset(workerDefaultsFromUser(useAuthStore.getState().user));
      }
    }
  }, [open, role, employerForm, workerForm]);

  // ── Submit: employer ───────────────────────────────────────────────────────
  const onSubmitEmployer = employerForm.handleSubmit(async (values) => {
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

  // ── Submit: worker ─────────────────────────────────────────────────────────
  const onSubmitWorker = workerForm.handleSubmit(async (values) => {
    try {
      await apiClient.post('/individual-requests', {
        role: 'worker',
        name: `${values.firstName} ${values.lastName}`.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        position: values.position.trim(),
        experience: values.experience.trim(),
        message: values.message?.trim() || '',
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

  const submittingEmployer = employerForm.formState.isSubmitting;
  const submittingWorker = workerForm.formState.isSubmitting;
  const submitting = role === 'employer' ? submittingEmployer : submittingWorker;

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
                {role === 'worker' ? 'Персональный подбор вакансий' : 'Персональный подбор персонала'}
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

          {/* ── EMPLOYER form ── */}
          {role === 'employer' && (
            <form onSubmit={onSubmitEmployer} className="space-y-4">
              <div>
                <label className={labelClass}>Название компании *</label>
                <input className={fieldClass} {...employerForm.register('companyName')} autoComplete="organization" />
                {employerForm.formState.errors.companyName?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.companyName.message)}</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Имя *</label>
                  <input className={fieldClass} {...employerForm.register('firstName')} />
                  {employerForm.formState.errors.firstName?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.firstName.message)}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Фамилия *</label>
                  <input className={fieldClass} {...employerForm.register('lastName')} />
                  {employerForm.formState.errors.lastName?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.lastName.message)}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Телефон *</label>
                  <input className={fieldClass} {...employerForm.register('phone')} placeholder="+79991234567" autoComplete="tel" />
                  {employerForm.formState.errors.phone?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.phone.message)}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input className={fieldClass} type="email" {...employerForm.register('email')} autoComplete="email" />
                  {employerForm.formState.errors.email?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.email.message)}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Тип мероприятия *</label>
                  <select className={`${fieldClass} cursor-pointer appearance-none bg-white/[0.07]`} {...employerForm.register('eventType')}>
                    {EVENT_TYPES.map((x) => (
                      <option key={x.value} value={x.value} className="bg-[#0d1f17] text-white">{x.label}</option>
                    ))}
                  </select>
                  {employerForm.formState.errors.eventType?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.eventType.message)}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Дата мероприятия</label>
                  <input className={`${fieldClass} [color-scheme:dark]`} type="date" {...employerForm.register('eventDate')} />
                  {employerForm.formState.errors.eventDate?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.eventDate.message)}</p>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>Какой персонал нужен *</label>
                <textarea className={`${fieldClass} min-h-[92px]`} rows={3} {...employerForm.register('staffNeeded')} />
                {employerForm.formState.errors.staffNeeded?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(employerForm.formState.errors.staffNeeded.message)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Количество человек</label>
                <input className={fieldClass} inputMode="numeric" {...employerForm.register('quantity')} />
              </div>
              <div>
                <label className={labelClass}>Комментарий</label>
                <textarea className={`${fieldClass} min-h-[76px]`} rows={2} {...employerForm.register('comment')} />
              </div>
              <ModalFooter submitting={submitting} onClose={() => onOpenChange(false)} />
            </form>
          )}

          {/* ── WORKER form ── */}
          {role === 'worker' && (
            <form onSubmit={onSubmitWorker} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Имя *</label>
                  <input className={fieldClass} {...workerForm.register('firstName')} />
                  {workerForm.formState.errors.firstName?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(workerForm.formState.errors.firstName.message)}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Фамилия *</label>
                  <input className={fieldClass} {...workerForm.register('lastName')} />
                  {workerForm.formState.errors.lastName?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(workerForm.formState.errors.lastName.message)}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Телефон *</label>
                  <input className={fieldClass} {...workerForm.register('phone')} placeholder="+79991234567" autoComplete="tel" />
                  {workerForm.formState.errors.phone?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(workerForm.formState.errors.phone.message)}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input className={fieldClass} type="email" {...workerForm.register('email')} autoComplete="email" />
                  {workerForm.formState.errors.email?.message && (
                    <p className="mt-1 text-xs text-red-300">{String(workerForm.formState.errors.email.message)}</p>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>Желаемая должность / специализация *</label>
                <input
                  className={fieldClass}
                  placeholder="Например: официант, бармен, повар..."
                  {...workerForm.register('position')}
                />
                {workerForm.formState.errors.position?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(workerForm.formState.errors.position.message)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Опыт работы *{' '}
                  <span className="font-normal text-white/35">(минимум 10 символов)</span>
                </label>
                <textarea
                  className={`${fieldClass} min-h-[92px]`}
                  rows={3}
                  placeholder="Опишите ваш опыт, навыки и предыдущие места работы..."
                  {...workerForm.register('experience')}
                />
                {workerForm.formState.errors.experience?.message && (
                  <p className="mt-1 text-xs text-red-300">{String(workerForm.formState.errors.experience.message)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Дополнительно</label>
                <textarea
                  className={`${fieldClass} min-h-[76px]`}
                  rows={2}
                  placeholder="Пожелания по графику, локации и т.д."
                  {...workerForm.register('message')}
                />
              </div>
              <ModalFooter submitting={submitting} onClose={() => onOpenChange(false)} />
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ModalFooter({ submitting, onClose }: { submitting: boolean; onClose: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        disabled={submitting}
        className={cn(
          'rounded-xl px-5 py-2.5 text-sm font-medium transition',
          'border border-transparent text-white/80 hover:bg-white/10 hover:text-white',
          submitting && 'pointer-events-none opacity-50',
        )}
        onClick={onClose}
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
  );
}
