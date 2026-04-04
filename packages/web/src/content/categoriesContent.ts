export const categoriesContent = {
  categories: [
    { id: 'waiters',      name: 'Официанты',          icon: 'UtensilsCrossed', href: '/vacancies?category=Официанты' },
    { id: 'bartenders',   name: 'Бармены',             icon: 'GlassWater',      href: '/vacancies?category=Бармены' },
    { id: 'cooks',        name: 'Повара',              icon: 'ChefHat',         href: '/vacancies?category=Повара' },
    { id: 'admins',       name: 'Администраторы',      icon: 'ClipboardList',   href: '/vacancies?category=Администраторы' },
    { id: 'hostess',      name: 'Хостес',              icon: 'UserCheck',       href: '/vacancies?category=Хостес' },
    { id: 'coordinators', name: 'Координаторы',        icon: 'CalendarCheck',   href: '/vacancies?category=Координаторы' },
    { id: 'banquet',      name: 'Банкетные менеджеры', icon: 'Star',            href: '/vacancies?category=Банкетные+менеджеры' },
    { id: 'dj',           name: 'Диджеи',              icon: 'Music2',          href: '/vacancies?category=Диджеи' },
    { id: 'cashiers',     name: 'Кассиры',             icon: 'CreditCard',      href: '/vacancies?category=Кассиры' },
    { id: 'wardrobe',     name: 'Гардеробщики',        icon: 'Shirt',           href: '/vacancies?category=Гардеробщики' },
    { id: 'technical',    name: 'Технический персонал',icon: 'Wrench',          href: '/vacancies?category=Технический+персонал' },
    { id: 'other',        name: 'Другие специалисты',  icon: 'Briefcase',       href: '/vacancies' },
  ],
} as const;
