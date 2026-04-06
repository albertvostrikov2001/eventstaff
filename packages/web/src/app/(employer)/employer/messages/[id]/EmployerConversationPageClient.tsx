'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/toast-context';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

interface ConvData {
  conversation: { id: string };
  messages: Message[];
}

export function EmployerConversationPageClient() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: ConvData }>(
        `/messages/conversations/${id}`,
        lastIdRef.current ? { after: lastIdRef.current } : undefined,
      );
      const newMsgs = res.data.messages;
      if (newMsgs.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          return [...prev, ...newMsgs.filter((m) => !existingIds.has(m.id))];
        });
        lastIdRef.current = newMsgs[newMsgs.length - 1].id;
      }
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<{ data: ConvData }>(`/messages/conversations/${id}`)
      .then((res) => {
        setMessages(res.data.messages);
        if (res.data.messages.length > 0) {
          lastIdRef.current = res.data.messages[res.data.messages.length - 1].id;
        }
      })
      .catch(() => toast('Ошибка загрузки', 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await apiClient.post<{ data: Message }>(
        `/messages/conversations/${id}/messages`,
        { content: content.trim() },
      );
      setMessages((prev) => [...prev, res.data]);
      lastIdRef.current = res.data.id;
      setContent('');
    } catch {
      toast('Ошибка отправки', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href="/employer/messages" className="rounded-full p-1.5 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="font-semibold text-gray-900">Диалог</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className={`h-10 w-48 animate-pulse rounded-card bg-gray-200 ${i % 2 === 0 ? '' : 'ml-auto'}`} />
          ))
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-card px-4 py-2 text-sm lg:max-w-md ${
                  isOwn ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-800'
                }`}>
                  <p>{msg.content}</p>
                  <p className={`mt-0.5 text-right text-xs ${isOwn ? 'text-primary-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Написать сообщение..."
            className="flex-1 rounded-input border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="rounded-input bg-primary-500 px-4 py-2 text-white disabled:opacity-60 hover:bg-primary-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
