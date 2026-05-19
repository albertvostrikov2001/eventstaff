import EmployerMessagesLayoutClient from './EmployerMessagesLayoutClient';

export default function EmployerMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh]">
      <EmployerMessagesLayoutClient>{children}</EmployerMessagesLayoutClient>
    </div>
  );
}
