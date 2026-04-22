'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Send } from 'lucide-react';

const employerSchema = z.object({
  role: z.literal('employer'),
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email(),
  company: z.string().min(1),
  eventType: z.string().min(1),
  eventDate: z.string().optional(),
  staffNeeded: z.string().min(1),
  quantity: z.coerce.number().optional(),
  message: z.string().min(1).max(8000),
});

const workerSchema = z.object({
  role: z.literal('worker'),
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email(),
  position: z.string().min(1),
  experience: z.string().min(1),
  availability: z.string().optional(),
  message: z.string().min(1).max(8000),
});

type Tab = 'employer' | 'worker';

export default function PublicRequestPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('employer');
  const [sending, setSending] = useState(false);

  const eForm = useForm({
    resolver: zodResolver(employerSchema),
    defaultValues: {
      role: 'employer' as const,
      name: '',
      phone: '',
      email: '',
      company: '',
      eventType: '',
      eventDate: '',
      staffNeeded: '',
      message: '',
    },
  });

  const wForm = useForm({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      role: 'worker' as const,
      name: '',
      phone: '',
      email: '',
      position: '',
      experience: '',
      availability: '',
      message: '',
    },
  });

  const onEmployer = eForm.handleSubmit(async (v) => {
    setSending(true);
    try {
      await apiClient.post('/individual-requests', {
        ...v,
        eventDate: v.eventDate || undefined,
        quantity: v.quantity,
      });
      toast('Заявка отправлена. Мы свяжемся с вами.', 'success');
      eForm.reset();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Ошибка', 'error');
    } finally {
      setSending(false);
    }
  });

  const onWorker = wForm.handleSubmit(async (v) => {
    setSending(true);
    try {
      await apiClient.post('/individual-requests', v);
      toast('Заявка отправлена. Мы свяжемся с вами.', 'success');
      wForm.reset();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Ошибка', 'error');
    } finally {
      setSending(false);
    }
  });

  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-2xl font-bold text-gray-900">Персональный запрос</h1>
      <p className="mt-1 text-sm text-gray-500">
        Расскажите, что вам нужно — команда Юнити ответит персонально.
      </p>

      <div className="mt-6 flex gap-2 rounded-input border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('employer')}
          className={`flex-1 rounded-input py-2 text-sm font-medium ${
            tab === 'employer' ? 'bg-primary-500 text-white' : 'text-gray-600'
          }`}
        >
          Для бизнеса
        </button>
        <button
          type="button"
          onClick={() => setTab('worker')}
          className={`flex-1 rounded-input py-2 text-sm font-medium ${
            tab === 'worker' ? 'bg-primary-500 text-white' : 'text-gray-600'
          }`}
        >
          Для специалиста
        </button>
      </div>

      {tab === 'employer' && (
        <form onSubmit={onEmployer} className="mt-8 space-y-4">
          {(['name', 'phone', 'email', 'company', 'eventType', 'eventDate', 'staffNeeded'] as const).map(
            (f) => (
              <div key={f}>
                <label className="text-xs text-gray-500">
                  {f === 'name' && 'Имя и фамилия *'}
                  {f === 'phone' && 'Телефон *'}
                  {f === 'email' && 'Email *'}
                  {f === 'company' && 'Компания *'}
                  {f === 'eventType' && 'Тип мероприятия *'}
                  {f === 'eventDate' && 'Дата мероприятия'}
                  {f === 'staffNeeded' && 'Какой персонал нужен *'}
                </label>
                <input
                  {...eForm.register(f)}
                  className="mt-1 w-full rounded-input border border-gray-200 px-3 py-2 text-sm"
                />
                {eForm.formState.errors[f] && (
                  <p className="mt-0.5 text-xs text-red-500">Обязательное поле</p>
                )}
              </div>
            ),
          )}
          <div>
            <label className="text-xs text-gray-500">Количество человек</label>
            <input
              type="number"
              min={1}
              {...eForm.register('quantity', { valueAsNumber: true })}
              className="mt-1 w-full rounded-input border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Комментарий *</label>
            <textarea
              {...eForm.register('message')}
              rows={4}
              className="mt-1 w-full rounded-input border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Отправить
          </button>
        </form>
      )}

      {tab === 'worker' && (
        <form onSubmit={onWorker} className="mt-8 space-y-4">
          {(
            [
              'name',
              'phone',
              'email',
              'position',
              'experience',
              'availability',
            ] as const
          ).map((f) => (
            <div key={f}>
              <label className="text-xs text-gray-500">
                {f === 'name' && 'Имя и фамилия *'}
                {f === 'phone' && 'Телефон *'}
                {f === 'email' && 'Email *'}
                {f === 'position' && 'Желаемая должность *'}
                {f === 'experience' && 'Опыт работы *'}
                {f === 'availability' && 'Когда готовы выйти'}
              </label>
              {f === 'experience' || f === 'availability' ? (
                <textarea
                  {...wForm.register(f)}
                  rows={f === 'experience' ? 4 : 2}
                  className="mt-1 w-full rounded-input border border-gray-200 px-3 py-2 text-sm"
                />
              ) : (
                <input
                  {...wForm.register(f)}
                  className="mt-1 w-full rounded-input border border-gray-200 px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500">Комментарий *</label>
            <textarea
              {...wForm.register('message')}
              rows={3}
              className="mt-1 w-full rounded-input border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-input bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Отправить
          </button>
        </form>
      )}
    </div>
  );
}
