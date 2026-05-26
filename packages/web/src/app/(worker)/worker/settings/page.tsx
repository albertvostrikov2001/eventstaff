'use client';

import { useState } from 'react';
import { z } from 'zod';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { useAuthStore } from '@/stores/authStore';

// ─── Password schema ───────────────────────────────────────────────────────────
const pwdSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: z.string().min(8, 'Минимум 8 символов'),
    confirmPassword: z.string().min(1, 'Подтвердите пароль'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

// ─── Reusable styles ───────────────────────────────────────────────────────────
const INPUT_CLS =
  'h-10 w-full rounded-[var(--r-2,6px)] border border-white/10 bg-white/[0.03] px-3.5 text-sm text-white/90 placeholder:text-white/30 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed';

const LABEL_CLS = 'mb-1.5 block text-[13px] font-medium text-white/70';

// ─── Delete confirm dialog ─────────────────────────────────────────────────────
function DeleteConfirmModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md rounded-[var(--r-5,14px)] border border-white/[0.08] p-6 shadow-2xl"
        style={{ background: '#131f19' }}
      >
        <h3
          className="mb-2 text-base font-semibold"
          style={{ color: 'var(--state-danger, #d96a6a)' }}
        >
          Удалить аккаунт?
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-white/55">
          Это действие необратимо. История смен, отзывов и заработка будет
          анонимизирована согласно политике конфиденциальности.
          <br />
          <br />
          Для удаления аккаунта свяжитесь с&nbsp;поддержкой:{' '}
          <a
            href="mailto:support@unity.ru"
            className="text-[var(--accent)] underline"
          >
            support@unity.ru
          </a>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[var(--r-4,10px)] border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white/70 transition hover:bg-white/[0.08]"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkerSettingsPage() {
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const email = user?.email ?? '';
  const phone = user?.phone ?? '';
  const hasEmail = Boolean(email);

  // Visibility (local state synced from store)
  const [visibility, setVisibility] = useState<string>(
    user?.workerProfile?.visibility ?? 'hidden',
  );
  const [savingVisibility, setSavingVisibility] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Toggle visibility ──
  const handleVisibilityChange = async (checked: boolean) => {
    const next = checked ? 'public' : 'hidden';
    setVisibility(next);
    setSavingVisibility(true);
    try {
      await apiClient.put('/worker/profile', { visibility: next });
      // Update store
      if (user && user.workerProfile) {
        setUser({ ...user, workerProfile: { ...user.workerProfile, visibility: next } });
      }
      toast(
        checked ? 'Профиль теперь виден в каталоге' : 'Профиль скрыт из каталога',
        'success',
      );
    } catch (err) {
      setVisibility(checked ? 'hidden' : 'public'); // revert
      if (err instanceof ApiError && err.code === 'PROFILE_INCOMPLETE') {
        toast('Заполните все обязательные поля профиля перед публикацией', 'error');
      } else {
        toast('Не удалось изменить видимость', 'error');
      }
    } finally {
      setSavingVisibility(false);
    }
  };

  // ── Change password ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    const parsed = pwdSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      setPwdError(parsed.error.errors[0]?.message ?? 'Проверьте поля');
      return;
    }
    setSavingPwd(true);
    try {
      await apiClient.patch('/auth/change-password', { currentPassword, newPassword });
      toast('Пароль изменён. Войдите снова.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 1500);
    } catch (err) {
      setPwdError(err instanceof ApiError ? err.message : 'Не удалось сменить пароль');
    } finally {
      setSavingPwd(false);
    }
  };

  const isPublic = visibility === 'public';

  return (
    <>
      {showDeleteModal && <DeleteConfirmModal onClose={() => setShowDeleteModal(false)} />}

      <div className="space-y-3.5">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white/90">Настройки</h1>
          <p className="mt-1 text-sm text-white/45">Аккаунт и безопасность</p>
        </div>

        {/* ── 1. Contacts ── */}
        <section className="rounded-[14px] border border-white/[0.06] bg-white/[0.04] p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-white/90">Контакты</h2>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label className={LABEL_CLS}>
                Email{' '}
                {hasEmail && (
                  <span
                    style={{
                      background: 'var(--state-success-bg, rgba(91,184,128,.10))',
                      color: 'var(--state-success, #5bb880)',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '.04em',
                      marginLeft: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Подтверждён
                  </span>
                )}
              </label>
              <input
                type="email"
                value={email}
                disabled
                className={INPUT_CLS}
                placeholder="Email не указан"
              />
            </div>

            {/* Phone */}
            <div>
              <label className={LABEL_CLS}>Телефон</label>
              <input
                type="tel"
                value={phone}
                disabled
                className={INPUT_CLS}
                placeholder="Не указан"
              />
            </div>
          </div>
          <p className="mt-3 text-[12px] text-white/35">
            Для изменения контактных данных обратитесь в поддержку:{' '}
            <a href="mailto:support@unity.ru" className="text-[var(--accent)] hover:underline">
              support@unity.ru
            </a>
          </p>
        </section>

        {/* ── 2. Password ── */}
        <section className="rounded-[14px] border border-white/[0.06] bg-white/[0.04] p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-white/90">Пароль</h2>
          <form onSubmit={(e) => void handleChangePassword(e)} className="flex flex-col gap-3.5">
            <div>
              <label className={LABEL_CLS}>Текущий пароль</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLS}>Новый пароль</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Минимум 8 символов"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Подтвердите</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>
            {pwdError && <p className="text-sm text-red-300">{pwdError}</p>}
            <div>
              <button
                type="submit"
                disabled={savingPwd}
                className="h-10 rounded-[var(--r-4,10px)] border border-[var(--border-emerald,rgba(91,184,128,.35))] bg-transparent px-4 text-sm font-medium text-white/90 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPwd ? 'Сохраняем…' : 'Изменить пароль'}
              </button>
            </div>
          </form>
        </section>

        {/* ── 3. Visibility ── */}
        <section className="rounded-[14px] border border-white/[0.06] bg-white/[0.04] p-5">
          <h2 className="mb-2 text-[15px] font-semibold text-white/90">Видимость профиля</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-white/45">
            Когда профиль скрыт, работодатели не могут найти вас в каталоге.
            Откликаться на вакансии всё равно можно.
          </p>
          <label className="flex cursor-pointer items-center gap-3 text-[14px] font-medium text-white/85">
            {/* Custom checkbox */}
            <span className="relative flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={isPublic}
                disabled={savingVisibility}
                onChange={(e) => void handleVisibilityChange(e.target.checked)}
              />
              <span
                className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] transition"
                style={{
                  background: isPublic ? 'var(--accent, #5bb880)' : 'rgba(0,0,0,.2)',
                  borderColor: isPublic ? 'var(--accent, #5bb880)' : 'rgba(255,255,255,.18)',
                }}
              >
                {isPublic && (
                  <svg viewBox="0 0 10 10" fill="none" className="h-[10px] w-[10px]">
                    <path
                      d="M1.5 5l2.5 2.5 4.5-4.5"
                      stroke="var(--bg-0, #08120e)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </span>
            Профиль виден в каталоге
          </label>
        </section>

        {/* ── 4. Delete account ── */}
        <section
          className="rounded-[14px] border p-5"
          style={{
            background: 'rgba(217,106,106,.04)',
            borderColor: 'rgba(217,106,106,.2)',
          }}
        >
          <h2
            className="mb-2 text-[15px] font-semibold"
            style={{ color: 'var(--state-danger, #d96a6a)' }}
          >
            Удаление аккаунта
          </h2>
          <p className="mb-4 text-[13px] leading-relaxed text-white/50">
            Удаление необратимо. История смен, отзывов и заработка будет
            анонимизирована согласно политике конфиденциальности.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="h-10 rounded-[var(--r-4,10px)] border px-4 text-sm font-medium transition hover:opacity-80"
            style={{
              background: 'rgba(217,106,106,.10)',
              color: 'var(--state-danger, #d96a6a)',
              borderColor: 'rgba(217,106,106,.3)',
            }}
          >
            Удалить аккаунт
          </button>
        </section>
      </div>
    </>
  );
}
