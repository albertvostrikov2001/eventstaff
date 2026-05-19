/**
 * Static demo data shown when the API is offline (dev/preview mode).
 * Mirrors seed.ts data so catalogs look alive without a running backend.
 */

const CITY = { id: 'novo-1', name: 'Новороссийск' };

// ── Workers ─────────────────────────────────────────────────────────────────

export const MOCK_WORKERS = [
  { id: 'w1', photoUrl: null, firstName: 'Анна',      lastName: 'Соколова',   categories: [{ category: 'waiter',         level: 'experienced' }, { category: 'hostess', level: 'experienced' }], city: CITY, desiredRate: '500',  rateType: 'hourly', experienceYears: 4,  ratingScore: '4.9', hasMedicalBook: true,  willingToTravel: true,  isVerified: true },
  { id: 'w2', firstName: 'Дмитрий',   lastName: 'Кравцов',    categories: [{ category: 'bartender',      level: 'expert'      }],                                                city: CITY, desiredRate: '700',  rateType: 'hourly', experienceYears: 7,  ratingScore: '4.8', hasMedicalBook: true,  willingToTravel: true,  isVerified: true },
  { id: 'w3', firstName: 'Мария',     lastName: 'Власова',    categories: [{ category: 'hostess',        level: 'experienced' }, { category: 'coordinator', level: 'experienced' }], city: CITY, desiredRate: '600', rateType: 'hourly', experienceYears: 3,  ratingScore: '4.7', hasMedicalBook: true,  willingToTravel: false, isVerified: true },
  { id: 'w4', firstName: 'Александр', lastName: 'Волков',     categories: [{ category: 'cook',           level: 'expert'      }],                                                city: CITY, desiredRate: '900',  rateType: 'hourly', experienceYears: 6,  ratingScore: '4.9', hasMedicalBook: true,  willingToTravel: true,  isVerified: true },
  { id: 'w5', firstName: 'Екатерина', lastName: 'Новикова',   categories: [{ category: 'administrator',  level: 'experienced' }],                                                city: CITY, desiredRate: '800',  rateType: 'hourly', experienceYears: 5,  ratingScore: '4.8', hasMedicalBook: true,  willingToTravel: false, isVerified: true },
  { id: 'w6', firstName: 'Иван',      lastName: 'Морозов',    categories: [{ category: 'waiter',         level: 'beginner'    }],                                                city: CITY, desiredRate: '400',  rateType: 'hourly', experienceYears: 1,  ratingScore: '4.5', hasMedicalBook: false, willingToTravel: true,  isVerified: false },
  { id: 'w7', firstName: 'Ольга',     lastName: 'Петрова',    categories: [{ category: 'coordinator',    level: 'expert'      }],                                                city: CITY, desiredRate: '1200', rateType: 'hourly', experienceYears: 9,  ratingScore: '4.9', hasMedicalBook: true,  willingToTravel: true,  isVerified: true },
  { id: 'w8', firstName: 'Сергей',    lastName: 'Лебедев',    categories: [{ category: 'technical',      level: 'experienced' }],                                                city: CITY, desiredRate: '600',  rateType: 'hourly', experienceYears: 5,  ratingScore: '4.7', hasMedicalBook: true,  willingToTravel: true,  isVerified: true },
  { id: 'w9', firstName: 'Виктория',  lastName: 'Зайцева',    categories: [{ category: 'bartender',      level: 'experienced' }],                                                city: CITY, desiredRate: '600',  rateType: 'hourly', experienceYears: 3,  ratingScore: '4.6', hasMedicalBook: true,  willingToTravel: false, isVerified: true },
  { id: 'w10', firstName: 'Никита',   lastName: 'Романов',    categories: [{ category: 'dj',             level: 'expert'      }],                                                city: CITY, desiredRate: '2200', rateType: 'hourly', experienceYears: 8,  ratingScore: '4.8', hasMedicalBook: false, willingToTravel: true,  isVerified: true },
  { id: 'w11', firstName: 'Татьяна',  lastName: 'Ефимова',    categories: [{ category: 'banquet_manager',level: 'expert'      }],                                                city: CITY, desiredRate: '1400', rateType: 'hourly', experienceYears: 12, ratingScore: '4.9', hasMedicalBook: true,  willingToTravel: false, isVerified: true },
  { id: 'w12', firstName: 'Артём',    lastName: 'Белов',      categories: [{ category: 'waiter',         level: 'beginner'    }, { category: 'technical', level: 'beginner' }],  city: CITY, desiredRate: '450',  rateType: 'hourly', experienceYears: 2,  ratingScore: '4.4', hasMedicalBook: true,  willingToTravel: true,  isVerified: false },
  { id: 'w13', firstName: 'Юлия',     lastName: 'Семёнова',   categories: [{ category: 'hostess',        level: 'experienced' }],                                                city: CITY, desiredRate: '550',  rateType: 'hourly', experienceYears: 4,  ratingScore: '4.7', hasMedicalBook: true,  willingToTravel: false, isVerified: true },
  { id: 'w14', firstName: 'Максим',   lastName: 'Григорьев',  categories: [{ category: 'administrator',  level: 'beginner'    }, { category: 'other', level: 'beginner' }],     city: CITY, desiredRate: '500',  rateType: 'hourly', experienceYears: 3,  ratingScore: '4.6', hasMedicalBook: true,  willingToTravel: false, isVerified: true },
  { id: 'w15', firstName: 'Дарья',    lastName: 'Орлова',     categories: [{ category: 'hostess',        level: 'beginner'    }, { category: 'other', level: 'beginner' }],     city: CITY, desiredRate: '350',  rateType: 'hourly', experienceYears: 1,  ratingScore: '4.5', hasMedicalBook: false, willingToTravel: true,  isVerified: false },
  { id: 'w16', firstName: 'Анна',     lastName: 'Смирнова',   categories: [{ category: 'bartender',      level: 'expert'      }],                                                city: CITY, desiredRate: '700',  rateType: 'hourly', experienceYears: 6,  ratingScore: '4.9', hasMedicalBook: true,  willingToTravel: true,  isVerified: true },
  { id: 'w17', firstName: 'Дмитрий',  lastName: 'Козлов',     categories: [{ category: 'waiter',         level: 'experienced' }],                                                city: CITY, desiredRate: '500',  rateType: 'hourly', experienceYears: 4,  ratingScore: '4.7', hasMedicalBook: true,  willingToTravel: false, isVerified: true },
  { id: 'w18', firstName: 'Алексей',  lastName: 'Новиков',    categories: [{ category: 'cook',           level: 'expert'      }],                                                city: CITY, desiredRate: '900',  rateType: 'hourly', experienceYears: 8,  ratingScore: '4.9', hasMedicalBook: true,  willingToTravel: true,  isVerified: true },
];

// ── Vacancies ────────────────────────────────────────────────────────────────

const EMPLOYERS = {
  prichal: { id: 'e1', companyName: 'Банкетный зал «Причал»', contactName: 'Ольга Романова', isVerified: true, logoUrl: null as string | null },
  anchor:  { id: 'e3', companyName: 'Ресторан «Якорь»',        contactName: 'Дмитрий Морозов', isVerified: true, logoUrl: null as string | null },
  catering:{ id: 'e4', companyName: 'Кейтеринг Новороссийск', contactName: 'Светлана Иванова', isVerified: true, logoUrl: null as string | null },
  marina:  { id: 'e5', companyName: 'Marina Events',           contactName: 'Марина Соколова',  isVerified: true, logoUrl: null as string | null },
};

const future = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

export const MOCK_VACANCIES = [
  { id: 'v1',  title: 'Официанты на банкет в честь юбилея',            category: 'waiter',          rate: '450',  rateType: 'hourly',    eventType: 'birthday',      employmentType: 'single_shift', dateStart: future(3),  employer: EMPLOYERS.prichal,  city: CITY, isUrgent: true  },
  { id: 'v2',  title: 'Бармен на корпоратив крупной компании',          category: 'bartender',       rate: '600',  rateType: 'hourly',    eventType: 'corporate',     employmentType: 'single_shift', dateStart: future(10), employer: EMPLOYERS.prichal,  city: CITY, isUrgent: false },
  { id: 'v3',  title: 'Хостес на встречу гостей выставки',              category: 'hostess',         rate: '500',  rateType: 'hourly',    eventType: 'conference',    employmentType: 'single_shift', dateStart: future(14), employer: EMPLOYERS.anchor,   city: CITY, isUrgent: false },
  { id: 'v4',  title: 'Повар холодного цеха на свадьбу',                category: 'cook',            rate: '800',  rateType: 'hourly',    eventType: 'wedding',       employmentType: 'single_shift', dateStart: future(8),  employer: EMPLOYERS.anchor,   city: CITY, isUrgent: false },
  { id: 'v5',  title: 'Координатор мероприятия — открытие отеля',       category: 'coordinator',     rate: '1200', rateType: 'hourly',    eventType: 'other',         employmentType: 'single_shift', dateStart: future(18), employer: EMPLOYERS.catering, city: CITY, isUrgent: false },
  { id: 'v6',  title: 'Бригада официантов на летнюю террасу',           category: 'waiter',          rate: '400',  rateType: 'hourly',    eventType: 'other',         employmentType: 'series',       dateStart: future(7),  employer: EMPLOYERS.catering, city: CITY, isUrgent: false },
  { id: 'v7',  title: 'Бармен на пляжную вечеринку',                    category: 'bartender',       rate: '700',  rateType: 'hourly',    eventType: 'private_party', employmentType: 'single_shift', dateStart: future(5),  employer: EMPLOYERS.marina,   city: CITY, isUrgent: true  },
  { id: 'v8',  title: 'Администратор зала на свадебный банкет',         category: 'administrator',   rate: '900',  rateType: 'hourly',    eventType: 'wedding',       employmentType: 'single_shift', dateStart: future(12), employer: EMPLOYERS.marina,   city: CITY, isUrgent: false },
  { id: 'v9',  title: 'Кассир на фуд-фестивале',                        category: 'other',           rate: '350',  rateType: 'hourly',    eventType: 'festival',      employmentType: 'single_shift', dateStart: future(9),  employer: EMPLOYERS.catering, city: CITY, isUrgent: false },
  { id: 'v10', title: 'DJ для корпоративного праздника',                 category: 'dj',              rate: '2500', rateType: 'hourly',    eventType: 'corporate',     employmentType: 'single_shift', dateStart: future(20), employer: EMPLOYERS.marina,   city: CITY, isUrgent: false },
  { id: 'v11', title: 'Технический персонал на конференцию',             category: 'technical',       rate: '500',  rateType: 'hourly',    eventType: 'conference',    employmentType: 'single_shift', dateStart: future(11), employer: EMPLOYERS.catering, city: CITY, isUrgent: false },
  { id: 'v12', title: 'Гардеробщик на новогодний корпоратив',           category: 'other',           rate: '300',  rateType: 'hourly',    eventType: 'corporate',     employmentType: 'single_shift', dateStart: future(25), employer: EMPLOYERS.prichal,  city: CITY, isUrgent: false },
  { id: 'v13', title: 'Банкетный менеджер на свадьбу 200 человек',      category: 'banquet_manager', rate: '1500', rateType: 'hourly',    eventType: 'wedding',       employmentType: 'single_shift', dateStart: future(16), employer: EMPLOYERS.marina,   city: CITY, isUrgent: false },
  { id: 'v14', title: 'Официанты на чайную церемонию (5 человек)',      category: 'waiter',          rate: '500',  rateType: 'hourly',    eventType: 'private_party', employmentType: 'single_shift', dateStart: future(6),  employer: EMPLOYERS.anchor,   city: CITY, isUrgent: false },
  { id: 'v15', title: 'Хостес-промо на открытии ресторана',             category: 'hostess',         rate: '600',  rateType: 'hourly',    eventType: 'other',         employmentType: 'single_shift', dateStart: future(4),  employer: EMPLOYERS.anchor,   city: CITY, isUrgent: false },
  { id: 'v16', title: 'Официант на свадебный банкет',                   category: 'waiter',          rate: '550',  rateType: 'hourly',    eventType: 'wedding',       employmentType: 'single_shift', dateStart: future(7),  employer: EMPLOYERS.prichal,  city: CITY, isUrgent: false },
  { id: 'v17', title: 'Бармен на корпоратив',                           category: 'bartender',       rate: '750',  rateType: 'hourly',    eventType: 'corporate',     employmentType: 'single_shift', dateStart: future(14), employer: EMPLOYERS.prichal,  city: CITY, isUrgent: false },
  { id: 'v18', title: 'Сомелье на винный вечер',                        category: 'sommelier',       rate: '1200', rateType: 'hourly',    eventType: 'private_party', employmentType: 'single_shift', dateStart: future(12), employer: EMPLOYERS.anchor,   city: CITY, isUrgent: false },
];

// ── Employers ────────────────────────────────────────────────────────────────

export const MOCK_EMPLOYERS = [
  {
    id: 'e1', slug: 'emp-prichal',
    companyName: 'Банкетный зал «Причал»', contactName: 'Ольга Романова',
    logoUrl: null, businessType: 'banquet_hall', city: CITY,
    description: 'Премиальный банкетный зал на берегу Цемесской бухты. Вместимость до 300 гостей. Работаем с 2015 года.',
    ratingScore: '4.8', isVerified: true, reliabilityScore: '94', responseRate: '92', _count: { vacancies: 5 },
  },
  {
    id: 'e3', slug: 'emp-yakor',
    companyName: 'Ресторан «Якорь»', contactName: 'Дмитрий Морозов',
    logoUrl: null, businessType: 'restaurant', city: CITY,
    description: 'Ресторан премиум-класса с панорамным видом на Цемесскую бухту. Авторская кухня, зал на 120 мест.',
    ratingScore: '4.9', isVerified: true, reliabilityScore: '96', responseRate: '98', _count: { vacancies: 6 },
  },
  {
    id: 'e4', slug: 'emp-catering-novo',
    companyName: 'Кейтеринг Новороссийск', contactName: 'Светлана Иванова',
    logoUrl: null, businessType: 'catering', city: CITY,
    description: 'Профессиональный кейтеринг по Новороссийску и краю. Свадьбы, корпоративы, частные мероприятия.',
    ratingScore: '4.7', isVerified: true, reliabilityScore: '90', responseRate: '88', _count: { vacancies: 4 },
  },
  {
    id: 'e5', slug: 'emp-marina-events',
    companyName: 'Marina Events', contactName: 'Марина Соколова',
    logoUrl: null, businessType: 'event_agency', city: CITY,
    description: 'Event-агентство полного цикла. Организация свадеб, корпоративов, фестивалей.',
    ratingScore: '4.8', isVerified: true, reliabilityScore: '93', responseRate: '95', _count: { vacancies: 4 },
  },
  {
    id: 'e2', slug: 'emp-catering-south',
    companyName: 'Кейтеринг «Южный»', contactName: 'Андрей Волков',
    logoUrl: null, businessType: 'catering', city: { id: 'krd-1', name: 'Краснодар' },
    description: 'Профессиональный выездной кейтеринг по всему Краснодарскому краю.',
    ratingScore: '4.6', isVerified: true, reliabilityScore: '88', responseRate: '85', _count: { vacancies: 3 },
  },
];
