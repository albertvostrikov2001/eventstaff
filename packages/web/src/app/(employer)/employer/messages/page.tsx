'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { MessageSquare, User } from 'lucide-react';

interface Participant {
  id: string;
  workerProfile?: { firstName: string; lastName: string } | null;
  employerProfile?: { companyName: string | null; contactName: string | null } | null;
}

interface Conversation {
  id: string;
  lastMessageAt: string | null;
  messages: { content: string }[];
  participants: Participant[];
}

function getParticipantName(p: Participant): string {
  if (p.workerProfile) return `${p.workerProfile.firstName} ${p.workerProfile.lastName}`.trim() || 'Специалист';
  if (p.employerProfile) return p.employerProfile.companyName ?? p.employerProfile.contactName ?? 'Работодатель';
  return 'Пользователь';
}

export default function EmployerMessagesPage() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: Conversation[] }>('/messages/conversations')
      .then((res) => setConversations(res.data))
      .catch(() => toast('Ошибка загрузки сообщений', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Сообщения</h1>
      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-card bg-gray-200" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-gray-200 bg-white py-16 text-center">
            <MessageSquare className="h-10 w-10 text-gray-300" />
            <h3 className="font-semibold text-gray-900">Нет сообщений</h3>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm">
            {conversations.map((conv, idx) => {
              const other = conv.participants[0];
              const lastMsg = conv.messages[0];
              return (
                <Link
                  key={conv.id}
                  href={`/employer/messages/${conv.id}`}
                  className={`flex items-center gap-3 px-5 py-4 transition hover:bg-gray-50 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{other ? getParticipantName(other) : 'Диалог'}</p>
                    {lastMsg && <p className="truncate text-sm text-gray-500">{lastMsg.content}</p>}
                  </div>
                  {conv.lastMessageAt && (
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(conv.lastMessageAt).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
