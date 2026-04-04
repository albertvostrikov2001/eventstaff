import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500">
          <span className="text-lg font-bold text-white">U</span>
        </div>
        <span className="font-heading text-2xl font-bold text-gray-900">Юнити</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
