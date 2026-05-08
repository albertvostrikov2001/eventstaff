import { LegacyChatRoomRedirectClient } from './LegacyChatRoomRedirectClient';

/** Placeholder for static export (GitHub Pages); real rooms load client-side after redirect. */
export function generateStaticParams() {
  return [{ roomId: 'placeholder' }];
}

export default function LegacyChatRoomRedirectPage() {
  return <LegacyChatRoomRedirectClient />;
}
