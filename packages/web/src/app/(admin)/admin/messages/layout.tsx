import AdminMessagesLayoutClient from './AdminMessagesLayoutClient';

export default function AdminMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh]">
      <AdminMessagesLayoutClient>{children}</AdminMessagesLayoutClient>
    </div>
  );
}
