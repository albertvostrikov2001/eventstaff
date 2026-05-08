import { Logo } from '@/components/ui/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--u-bg-dark)' }}
    >
      <div className="mb-8">
        <Logo size="lg" showText href="/" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
