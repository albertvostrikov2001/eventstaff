'use client';

import Link from 'next/link';
import {
  UtensilsCrossed,
  GlassWater,
  ChefHat,
  ClipboardList,
  UserCheck,
  CalendarCheck,
  Star,
  Music2,
  CreditCard,
  Shirt,
  Wrench,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  UtensilsCrossed,
  GlassWater,
  ChefHat,
  ClipboardList,
  UserCheck,
  CalendarCheck,
  Star,
  Music2,
  CreditCard,
  Shirt,
  Wrench,
  Briefcase,
};

interface CategoryCardProps {
  name: string;
  icon: string;
  href: string;
}

export function CategoryCard({ name, icon, href }: CategoryCardProps) {
  const Icon = ICON_MAP[icon] ?? Briefcase;

  return (
    <Link href={href} className="category-card" aria-label={`Найти ${name}`}>
      <div className="category-card-icon" aria-hidden="true">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <span className="category-card-name">{name}</span>
    </Link>
  );
}
