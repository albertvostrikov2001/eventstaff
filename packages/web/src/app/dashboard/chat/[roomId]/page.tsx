import { LegacyChatRoomRedirectClient } from './LegacyChatRoomRedirectClient';

export const dynamic = 'force-dynamic';

/** @deprecated Legacy /dashboard/chat/[roomId] — redirects to role messages. */
export default function LegacyChatRoomRedirectPage({
  params,
}: {
  params: { roomId: string };
}) {
  return <LegacyChatRoomRedirectClient roomId={params.roomId} />;
}
