export const STAFF_CATEGORIES = {
  waiter: 'Официант',
  bartender: 'Бармен',
  cook: 'Повар',
  administrator: 'Администратор',
  coordinator: 'Координатор',
  technical: 'Технический персонал',
  hookah_master: 'Кальянщик',
  banquet_manager: 'Банкетный менеджер',
  dj: 'Диджей',
  barista: 'Бариста',
  sommelier: 'Сомелье',
  hostess: 'Хостес',
  cleaner: 'Клининг',
  other: 'Другое',
} as const;

export const EVENT_TYPES = {
  wedding: 'Свадьба',
  corporate: 'Корпоратив',
  banquet: 'Банкет',
  conference: 'Конференция',
  festival: 'Фестиваль',
  private_party: 'Частная вечеринка',
  birthday: 'День рождения',
  catering_event: 'Кейтеринг',
  other: 'Другое',
} as const;

export const RATE_TYPES = {
  hourly: 'За час',
  per_shift: 'За смену',
  fixed: 'Фиксированная',
  daily: 'За день',
  weekly: 'За неделю',
  after_event: 'По итогам мероприятия',
} as const;

export const EMPLOYMENT_TYPES = {
  single_shift: 'Разовая смена',
  series: 'Серия смен',
  permanent: 'Постоянная',
  part_time: 'Подработка',
  project: 'Проект',
} as const;

export const WORKER_LEVELS = {
  beginner: 'Начинающий',
  experienced: 'Опытный',
  expert: 'Эксперт',
} as const;

export const BUSINESS_TYPES = {
  restaurant: 'Ресторан',
  catering: 'Кейтеринг',
  event_agency: 'Event-агентство',
  banquet_hall: 'Банкетный зал',
  individual: 'Частный заказчик',
  hotel: 'Отель',
  conference: 'Конференц-площадка',
  other: 'Другое',
} as const;

export const APPLICATION_STATUSES = {
  pending: 'Ожидает',
  viewed: 'Просмотрен',
  invited: 'Приглашён',
  interview: 'Собеседование',
  confirmed: 'Подтверждён',
  shift_started: 'На смене',
  completed: 'Завершён',
  cancelled: 'Отменён',
  rejected: 'Отклонён',
} as const;

export const VACANCY_STATUSES = {
  draft: 'Черновик',
  pending_moderation: 'На модерации',
  active: 'Активна',
  closed: 'Закрыта',
  archived: 'В архиве',
  rejected: 'Отклонена',
} as const;

export const SUBSCRIPTION_PLANS = {
  free: { name: 'Бесплатный', vacancyLimit: 3, contactsLimit: 5 },
  basic: { name: 'Базовый', vacancyLimit: 15, contactsLimit: 50 },
  pro: { name: 'Профессиональный', vacancyLimit: 50, contactsLimit: 200 },
  enterprise: { name: 'Корпоративный', vacancyLimit: -1, contactsLimit: -1 },
} as const;

export const OTP_EXPIRY_MINUTES = 5;
export const REVIEW_WINDOW_DAYS = 14;
export const RATING_RECENT_REVIEWS_COUNT = 20;
export const MAX_PORTFOLIO_PHOTOS = 20;
export const MAX_PHOTO_SIZE_MB = 5;
export const MAX_DOCUMENT_SIZE_MB = 10;
export const MAX_VIDEO_SIZE_MB = 100;
export const MAX_VIDEO_DURATION_SEC = 60;
