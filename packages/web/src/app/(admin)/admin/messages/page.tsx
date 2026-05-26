'use client';

export default function AdminMessagesIndexPage() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
      <p className="text-base font-medium text-white/65">Выберите диалог</p>
      <p className="mt-1 max-w-sm text-sm text-white/50">
        Откройте чат с пользователем из карточки персональной заявки
      </p>
    </div>
  );
}
