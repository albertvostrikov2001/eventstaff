import type { LucideIcon } from 'lucide-react';

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function AdminEmptyState({ icon: Icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-input border border-dashed border-white/[0.10] bg-white/[0.02] px-6 py-12 text-center">
      <Icon className="mb-4 h-10 w-10 text-white/40" strokeWidth={1.5} />
      <p className="text-sm font-medium text-white/70">{title}</p>
      {description && <p className="mt-1 text-xs text-white/50">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
