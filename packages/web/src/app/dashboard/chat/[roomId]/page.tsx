import { LegacyChatRoomRedirectClient } from './LegacyChatRoomRedirectClient';
import { PAGE_DYNAMIC, buildStaticParams } from '@/lib/static-export-routes';

export const dynamic = PAGE_DYNAMIC;

export function generateStaticParams() {
  return buildStaticParams([{ roomId: 'placeholder' }]);
}

/** @deprecated Legacy /dashboard/chat/[roomId] — redirects to role messages. */
export default function LegacyChatRoomRedirectPage({
  params,
}: {
  params: { roomId: string };
}) {
  return <LegacyChatRoomRedirectClient roomId={params.roomId} />;
}
