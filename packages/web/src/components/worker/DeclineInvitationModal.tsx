'use client';

import { useState } from 'react';

/**
 * Модал отклонения приглашения работником.
 * Общий компонент для страниц «Приглашения» и «Мои отклики».
 */
export function DeclineInvitationModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: (message: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-modal border border-white/10 bg-[#0f1f17] p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white">Отклонить приглашение</h3>
        <p className="mt-1 text-sm text-white/50">Причина необязательна, но поможет работодателю.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Причина (необязательно)..."
          className="mt-4 w-full rounded-input border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary-400/50 focus:outline-none"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-input border border-white/20 py-2.5 text-sm text-white/70 hover:border-white/40"
          >
            Назад
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 rounded-input border border-red-500/40 bg-red-950/50 py-2.5 text-sm font-semibold text-red-300 hover:border-red-500/70 disabled:opacity-50"
          >
            {loading ? 'Отклоняем...' : 'Отклонить'}
          </button>
        </div>
      </div>
    </div>
  );
}
