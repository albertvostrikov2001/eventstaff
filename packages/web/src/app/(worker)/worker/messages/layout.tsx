import WorkerMessagesLayoutClient from './WorkerMessagesLayoutClient';

export default function WorkerMessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh]">
      <WorkerMessagesLayoutClient>{children}</WorkerMessagesLayoutClient>
    </div>
  );
}
