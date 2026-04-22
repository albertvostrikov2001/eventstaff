'use client';

export function ModerationBadge({
  status,
  note,
}: {
  status: 'pending' | 'approved' | 'rejected';
  note?: string | null;
}) {
  if (status === 'pending') {
    return (
      <p className="mt-1 text-xs text-amber-700">
        <span aria-hidden>🟡</span> На проверке — файл загружен, ждёт модерации
      </p>
    );
  }
  if (status === 'approved') {
    return (
      <p className="mt-1 text-xs text-green-700">
        <span aria-hidden>✅</span> Одобрено — видно другим пользователям
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-red-700">
      <span aria-hidden>❌</span> Отклонено
      {note ? `: ${note}` : ''}
    </p>
  );
}
