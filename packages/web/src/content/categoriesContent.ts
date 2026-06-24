// Ссылки ведут на SEO-посадочные /personnel/<enumKey> (ключи совпадают со
// STAFF_CATEGORIES и фильтром каталога). Раньше тут были русские лейблы во
// множественном числе — фильтр их не матчил и всегда сбрасывал на «официанта».
export const categoriesContent = {
  categories: [
    { id: 'waiter',          name: 'Официанты',          icon: 'UtensilsCrossed', href: '/personnel/waiter' },
    { id: 'bartender',       name: 'Бармены',             icon: 'GlassWater',      href: '/personnel/bartender' },
    { id: 'cook',            name: 'Повара',              icon: 'ChefHat',         href: '/personnel/cook' },
    { id: 'administrator',   name: 'Администраторы',      icon: 'ClipboardList',   href: '/personnel/administrator' },
    { id: 'hostess',         name: 'Хостес',              icon: 'UserCheck',       href: '/personnel/hostess' },
    { id: 'coordinator',     name: 'Координаторы',        icon: 'CalendarCheck',   href: '/personnel/coordinator' },
    { id: 'banquet_manager', name: 'Банкетные менеджеры', icon: 'Star',            href: '/personnel/banquet_manager' },
    { id: 'dj',              name: 'Диджеи',              icon: 'Music2',          href: '/personnel/dj' },
    { id: 'barista',         name: 'Бариста',             icon: 'Coffee',          href: '/personnel/barista' },
    { id: 'cleaner',         name: 'Клининг',             icon: 'Sparkles',        href: '/personnel/cleaner' },
    { id: 'technical',       name: 'Технический персонал',icon: 'Wrench',          href: '/personnel/technical' },
    { id: 'other',           name: 'Другие специалисты',  icon: 'Briefcase',       href: '/personnel/other' },
  ],
} as const;
