import {
  PrismaClient,
  StaffCategory,
  Visibility,
  ApplicationStatus,
  VacancyStatus,
  RateType,
  EmploymentType,
  EventType,
  BusinessType,
  EmployerType,
  WorkerLevel,
  Role,
  ReviewStatus,
  ReviewTargetType,
  ReliabilityLevel,
  UserReviewPlan,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Cities ───────────────────────────────────────────────────────────────
  const novorossiysk = await prisma.city.upsert({
    where: { slug: 'novorossiysk' },
    create: { name: 'Новороссийск', slug: 'novorossiysk', region: 'Краснодарский край', isActive: true },
    update: {},
  });
  const krasnodar = await prisma.city.upsert({
    where: { slug: 'krasnodar' },
    create: { name: 'Краснодар', slug: 'krasnodar', region: 'Краснодарский край', isActive: true },
    update: {},
  });
  const anapa = await prisma.city.upsert({
    where: { slug: 'anapa' },
    create: { name: 'Анапа', slug: 'anapa', region: 'Краснодарский край', isActive: true },
    update: {},
  });
  await prisma.city.upsert({
    where: { slug: 'gelendzhik' },
    create: { name: 'Геленджик', slug: 'gelendzhik', region: 'Краснодарский край', isActive: true },
    update: {},
  });

  // ─── Admin ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin1234!', BCRYPT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@unity-staff.ru' },
    create: {
      email: 'admin@unity-staff.ru',
      passwordHash: adminHash,
      activeRole: Role.admin,
      emailVerified: true,
      roles: { create: { role: Role.admin } },
    },
    update: {
      passwordHash: adminHash,
      activeRole: Role.admin,
      emailVerified: true,
      status: 'active',
    },
  });
  console.log('✅ Admin:', admin.email);

  // ─── Employers ────────────────────────────────────────────────────────────
  const empHash = await bcrypt.hash('Test1234!', BCRYPT_ROUNDS);

  // Employer 1 — Банкетный зал «Причал»
  const empUser1 = await prisma.user.upsert({
    where: { email: 'prichal@test.ru' },
    create: {
      email: 'prichal@test.ru',
      passwordHash: empHash,
      activeRole: Role.employer,
      emailVerified: true,
      roles: { create: { role: Role.employer } },
    },
    update: {},
  });
  const ep1 = await prisma.employerProfile.upsert({
    where: { userId: empUser1.id },
    create: {
      userId: empUser1.id,
      slug: 'emp-prichal',
      type: EmployerType.company,
      companyName: 'Банкетный зал «Причал»',
      contactName: 'Ольга Романова',
      businessType: BusinessType.banquet_hall,
      cityId: novorossiysk.id,
      website: 'https://prichal-banket.ru',
      inn: '2315012345',
      description:
        'Премиальный банкетный зал на берегу Цемесской бухты. Вместимость до 300 гостей. Работаем с 2015 года, провели более 500 мероприятий: свадьбы, корпоративы, юбилеи. Собственная кухня, профессиональная команда, полный цикл организации.',
      isVerified: true,
      verifiedAt: new Date('2024-03-15'),
      reliabilityScore: 94,
      responseRate: 92,
      ratingScore: 4.8,
    },
    update: { isVerified: true, verifiedAt: new Date('2024-03-15'), reliabilityScore: 94, responseRate: 92, ratingScore: 4.8 },
  });

  // Employer 2 — Кейтеринг «Южный»
  const empUser2 = await prisma.user.upsert({
    where: { email: 'catering.south@test.ru' },
    create: {
      email: 'catering.south@test.ru',
      passwordHash: empHash,
      activeRole: Role.employer,
      emailVerified: true,
      roles: { create: { role: Role.employer } },
    },
    update: {},
  });
  const ep2 = await prisma.employerProfile.upsert({
    where: { userId: empUser2.id },
    create: {
      userId: empUser2.id,
      slug: 'emp-catering-south',
      type: EmployerType.company,
      companyName: 'Кейтеринг «Южный»',
      contactName: 'Андрей Волков',
      businessType: BusinessType.catering,
      cityId: krasnodar.id,
      website: 'https://catering-south.ru',
      inn: '2308098765',
      description:
        'Профессиональный выездной кейтеринг по всему Краснодарскому краю. Специализируемся на свадебных банкетах, корпоративных обедах и фуршетах. Собственный автопарк, оборудование и штат 50+ сотрудников. Работаем с 2012 года.',
      isVerified: true,
      verifiedAt: new Date('2024-01-10'),
      reliabilityScore: 88,
      responseRate: 85,
      ratingScore: 4.6,
    },
    update: { isVerified: true, verifiedAt: new Date('2024-01-10'), reliabilityScore: 88, responseRate: 85, ratingScore: 4.6 },
  });

  // Employer 3 — Ресторан «Якорь»
  const empUser3 = await prisma.user.upsert({
    where: { email: 'rest.anchor@test.ru' },
    create: {
      email: 'rest.anchor@test.ru',
      passwordHash: empHash,
      activeRole: Role.employer,
      emailVerified: true,
      roles: { create: { role: Role.employer } },
    },
    update: {},
  });
  const ep3 = await prisma.employerProfile.upsert({
    where: { userId: empUser3.id },
    create: {
      userId: empUser3.id,
      slug: 'emp-yakor',
      type: EmployerType.company,
      companyName: 'Ресторан «Якорь»',
      contactName: 'Дмитрий Морозов',
      businessType: BusinessType.restaurant,
      cityId: novorossiysk.id,
      website: 'https://yakor-resto.ru',
      inn: '2315087654',
      description:
        'Ресторан премиум-класса с панорамным видом на Цемесскую бухту. Авторская кухня, коллекция вин 200+ позиций. Зал на 120 мест. Регулярно проводим закрытые вечеринки, дегустации вин и корпоративные мероприятия. Ищем профессионалов, разделяющих нашу философию сервиса.',
      isVerified: true,
      verifiedAt: new Date('2024-02-20'),
      reliabilityScore: 96,
      responseRate: 98,
      ratingScore: 4.9,
    },
    update: { isVerified: true, verifiedAt: new Date('2024-02-20'), reliabilityScore: 96, responseRate: 98, ratingScore: 4.9 },
  });

  console.log('✅ 3 employers created');

  // ─── Workers ──────────────────────────────────────────────────────────────
  const workHash = await bcrypt.hash('Worker1234!', BCRYPT_ROUNDS);

  // Worker 1 — Анна Смирнова, бармен
  const wUser1 = await prisma.user.upsert({
    where: { email: 'anna.smirnova@test.ru' },
    create: {
      email: 'anna.smirnova@test.ru',
      passwordHash: workHash,
      activeRole: Role.worker,
      emailVerified: true,
      roles: { create: { role: Role.worker } },
    },
    update: {},
  });
  const wp1 = await prisma.workerProfile.upsert({
    where: { userId: wUser1.id },
    create: {
      userId: wUser1.id,
      slug: 'worker-anna-smirnova',
      firstName: 'Анна',
      lastName: 'Смирнова',
      age: 28,
      cityId: novorossiysk.id,
      bio: 'Профессиональный бармен с 6-летним опытом работы на мероприятиях различного масштаба. Специализируюсь на классических коктейлях и авторских миксах. Работала на свадьбах, корпоративах и частных вечеринках до 500 человек. Имею медицинскую книжку, сертификат бармена, всегда в форме и улыбаюсь. Готова к выездам по краю.',
      desiredRate: 700,
      rateType: RateType.hourly,
      experienceYears: 6,
      hasMedicalBook: true,
      willingToTravel: true,
      overtimeReady: true,
      visibility: Visibility.public,
      isVerified: true,
      verifiedAt: new Date('2024-02-01'),
      ratingScore: 4.9,
      totalReviews: 23,
      totalShifts: 87,
      languages: ['Русский', 'Английский'],
      dressSizes: 'S/M',
    },
    update: { ratingScore: 4.9, totalReviews: 23, totalShifts: 87, isVerified: true },
  });
  await prisma.workerCategory.upsert({
    where: { workerId_category: { workerId: wp1.id, category: StaffCategory.bartender } },
    create: { workerId: wp1.id, category: StaffCategory.bartender, level: WorkerLevel.expert, specialization: 'Коктейли, барное шоу' },
    update: { level: WorkerLevel.expert },
  });

  // Worker 2 — Дмитрий Козлов, официант
  const wUser2 = await prisma.user.upsert({
    where: { email: 'dmitry.kozlov@test.ru' },
    create: {
      email: 'dmitry.kozlov@test.ru',
      passwordHash: workHash,
      activeRole: Role.worker,
      emailVerified: true,
      roles: { create: { role: Role.worker } },
    },
    update: {},
  });
  const wp2 = await prisma.workerProfile.upsert({
    where: { userId: wUser2.id },
    create: {
      userId: wUser2.id,
      slug: 'worker-dmitry-kozlov',
      firstName: 'Дмитрий',
      lastName: 'Козлов',
      age: 25,
      cityId: novorossiysk.id,
      bio: 'Официант с 4-летним опытом. Работал в ресторанах категории 4–5 звёзд и на выездных банкетах. Умею работать с серебром, знаком с протоколом обслуживания VIP-гостей. Ответственный, пунктуальный, стрессоустойчивый. Есть медицинская книжка. Ищу интересные мероприятия.',
      desiredRate: 500,
      rateType: RateType.hourly,
      experienceYears: 4,
      hasMedicalBook: true,
      willingToTravel: false,
      overtimeReady: true,
      visibility: Visibility.public,
      isVerified: true,
      verifiedAt: new Date('2024-03-01'),
      ratingScore: 4.7,
      totalReviews: 18,
      totalShifts: 64,
      languages: ['Русский'],
      dressSizes: 'M/L',
    },
    update: { ratingScore: 4.7, totalReviews: 18, totalShifts: 64, isVerified: true },
  });
  await prisma.workerCategory.upsert({
    where: { workerId_category: { workerId: wp2.id, category: StaffCategory.waiter } },
    create: { workerId: wp2.id, category: StaffCategory.waiter, level: WorkerLevel.experienced, specialization: 'Банкетное обслуживание, VIP-сервис' },
    update: { level: WorkerLevel.experienced },
  });

  // Worker 3 — Алексей Новиков, повар
  const wUser3 = await prisma.user.upsert({
    where: { email: 'alexey.novikov@test.ru' },
    create: {
      email: 'alexey.novikov@test.ru',
      passwordHash: workHash,
      activeRole: Role.worker,
      emailVerified: true,
      roles: { create: { role: Role.worker } },
    },
    update: {},
  });
  const wp3 = await prisma.workerProfile.upsert({
    where: { userId: wUser3.id },
    create: {
      userId: wUser3.id,
      slug: 'worker-alexey-novikov',
      firstName: 'Алексей',
      lastName: 'Новиков',
      age: 34,
      cityId: novorossiysk.id,
      bio: 'Шеф-повар с 8-летним опытом. Специализируюсь на русской и средиземноморской кухне. Работал в ресторанах Новороссийска и Краснодара, организовывал выездные кейтеринговые мероприятия на 50–300 человек. Умею работать в команде и один. Есть санитарная книжка, сертификаты по безопасности пищевого производства.',
      desiredRate: 900,
      rateType: RateType.hourly,
      experienceYears: 8,
      hasMedicalBook: true,
      willingToTravel: true,
      overtimeReady: false,
      visibility: Visibility.public,
      isVerified: true,
      verifiedAt: new Date('2024-01-15'),
      ratingScore: 4.95,
      totalReviews: 31,
      totalShifts: 112,
      languages: ['Русский', 'Английский', 'Итальянский'],
      dressSizes: 'XL',
    },
    update: { ratingScore: 4.95, totalReviews: 31, totalShifts: 112, isVerified: true },
  });
  await prisma.workerCategory.upsert({
    where: { workerId_category: { workerId: wp3.id, category: StaffCategory.cook } },
    create: { workerId: wp3.id, category: StaffCategory.cook, level: WorkerLevel.expert, specialization: 'Русская и средиземноморская кухня, кейтеринг' },
    update: { level: WorkerLevel.expert },
  });

  console.log('✅ 3 workers created');

  // ─── Work History ─────────────────────────────────────────────────────────
  // Anna
  for (const wh of [
    { title: 'Старший бармен', company: 'Банкетный зал «Причал»', desc: 'Обслуживание банкетов и корпоративов, обучение стажёров', from: new Date('2022-05-01'), to: new Date('2024-08-01') },
    { title: 'Бармен', company: 'Ресторан «Якорь»', desc: 'Работа на баре, составление коктейльной карты', from: new Date('2019-03-01'), to: new Date('2022-04-30') },
  ]) {
    const exists = await prisma.workHistory.findFirst({ where: { workerId: wp1.id, title: wh.title, company: wh.company } });
    if (!exists) {
      await prisma.workHistory.create({ data: { workerId: wp1.id, title: wh.title, company: wh.company, description: wh.desc, dateFrom: wh.from, dateTo: wh.to } });
    }
  }
  // Dmitry
  for (const wh of [
    { title: 'Официант', company: 'Отель «Черноморец»', desc: 'Ресторанное и банкетное обслуживание гостей отеля', from: new Date('2021-06-01'), to: new Date('2024-09-01') },
    { title: 'Помощник официанта', company: 'Кафе «Морской бриз»', desc: 'Обучение сервису, работа в смешанных командах', from: new Date('2020-01-01'), to: new Date('2021-05-31') },
  ]) {
    const exists = await prisma.workHistory.findFirst({ where: { workerId: wp2.id, title: wh.title, company: wh.company } });
    if (!exists) {
      await prisma.workHistory.create({ data: { workerId: wp2.id, title: wh.title, company: wh.company, description: wh.desc, dateFrom: wh.from, dateTo: wh.to } });
    }
  }
  // Alexey
  for (const wh of [
    { title: 'Шеф-повар', company: 'Ресторан «Якорь»', desc: 'Управление кухней, разработка меню, кейтеринг до 300 персон', from: new Date('2020-07-01'), to: new Date('2024-12-01') },
    { title: 'Су-шеф', company: 'Кейтеринг «Южный»', desc: 'Приготовление блюд на выездных мероприятиях', from: new Date('2017-04-01'), to: new Date('2020-06-30') },
    { title: 'Повар 5 разряда', company: 'Ресторан «Бриз»', desc: 'Работа на горячем и холодном цеху', from: new Date('2016-01-01'), to: new Date('2017-03-31') },
  ]) {
    const exists = await prisma.workHistory.findFirst({ where: { workerId: wp3.id, title: wh.title, company: wh.company } });
    if (!exists) {
      await prisma.workHistory.create({ data: { workerId: wp3.id, title: wh.title, company: wh.company, description: wh.desc, dateFrom: wh.from, dateTo: wh.to } });
    }
  }

  console.log('✅ Work history created');

  // ─── Vacancies (3 per employer) ───────────────────────────────────────────
  const now = new Date();
  const future = (days: number) => new Date(now.getTime() + days * 86400_000);

  type VacancySeed = {
    slug: string;
    employerId: string;
    cityId: string;
    title: string;
    category: StaffCategory;
    rate: number;
    rateType: RateType;
    eventType: EventType;
    employmentType: EmploymentType;
    dateStart: Date;
    dateEnd?: Date;
    timeStart?: string;
    timeEnd?: string;
    status: VacancyStatus;
    workersNeeded: number;
    responsibilities: string;
    requirements: string;
    conditions: string;
    dressCode?: string;
    experienceRequired?: number;
    foodProvided: boolean;
    transportProvided: boolean;
    tipsPossible: boolean;
    isUrgent: boolean;
    description: string;
  };

  const vacanciesData: VacancySeed[] = [
    // ── ep1 (Банкетный зал «Причал») ──────────────────────────────────────
    {
      slug: 'v-prichal-waiter-1',
      employerId: ep1.id,
      cityId: novorossiysk.id,
      title: 'Официант на свадебный банкет',
      category: StaffCategory.waiter,
      rate: 550,
      rateType: RateType.hourly,
      eventType: EventType.wedding,
      employmentType: EmploymentType.single_shift,
      dateStart: future(7),
      timeStart: '14:00',
      timeEnd: '02:00',
      status: VacancyStatus.active,
      workersNeeded: 4,
      responsibilities: 'Сервировка столов по протоколу, подача блюд и напитков, уборка после банкета, работа в команде.',
      requirements: 'Опыт работы на свадьбах от 1 года, наличие медицинской книжки, аккуратный внешний вид, стрессоустойчивость.',
      conditions: 'Оплата по факту смены. Питание за счёт работодателя. Парковка на территории.',
      dressCode: 'Белая рубашка, чёрные брюки/юбка, фартук (предоставляется)',
      experienceRequired: 1,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Банкетный зал «Причал» приглашает официантов на свадебный банкет. Мероприятие на 120 гостей, 12 часов работы. Дружная команда, чёткая организация.',
    },
    {
      slug: 'v-prichal-bartender-1',
      employerId: ep1.id,
      cityId: novorossiysk.id,
      title: 'Бармен на корпоратив',
      category: StaffCategory.bartender,
      rate: 750,
      rateType: RateType.hourly,
      eventType: EventType.corporate,
      employmentType: EmploymentType.single_shift,
      dateStart: future(14),
      timeStart: '17:00',
      timeEnd: '23:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Приготовление коктейлей и безалкогольных напитков, работа с кассой, поддержание чистоты на баре.',
      requirements: 'Знание классических коктейлей, опыт от 2 лет, презентабельный внешний вид, медицинская книжка.',
      conditions: 'Почасовая оплата. Ужин предоставляется.',
      dressCode: 'Чёрная форма (предоставляется), собственная обувь',
      experienceRequired: 2,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Ищем опытного бармена на корпоративный вечер крупной компании. 60 гостей, работа за мобильным баром.',
    },
    {
      slug: 'v-prichal-hostess-1',
      employerId: ep1.id,
      cityId: novorossiysk.id,
      title: 'Хостес на конференцию',
      category: StaffCategory.hostess,
      rate: 450,
      rateType: RateType.hourly,
      eventType: EventType.conference,
      employmentType: EmploymentType.single_shift,
      dateStart: future(21),
      timeStart: '08:00',
      timeEnd: '18:00',
      status: VacancyStatus.active,
      workersNeeded: 3,
      responsibilities: 'Встреча и регистрация гостей, раздача материалов, навигация по площадке, помощь организаторам.',
      requirements: 'Приятный внешний вид, грамотная речь, знание делового этикета, пунктуальность. Опыт приветствуется.',
      conditions: 'Оплата почасово, обед за счёт организатора.',
      dressCode: 'Деловой стиль: костюм или платье (предоставляется)',
      experienceRequired: 0,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Приглашаем хостес на однодневную бизнес-конференцию. 200 участников, работа с регистрацией и информационными стойками.',
    },

    // ── ep2 (Кейтеринг «Южный») ───────────────────────────────────────────
    {
      slug: 'v-south-cook-1',
      employerId: ep2.id,
      cityId: krasnodar.id,
      title: 'Повар на выездной кейтеринг',
      category: StaffCategory.cook,
      rate: 1000,
      rateType: RateType.hourly,
      eventType: EventType.catering_event,
      employmentType: EmploymentType.project,
      dateStart: future(5),
      dateEnd: future(6),
      timeStart: '08:00',
      timeEnd: '20:00',
      status: VacancyStatus.active,
      workersNeeded: 3,
      responsibilities: 'Приготовление горячих и холодных блюд на площадке, соблюдение технологических карт, контроль качества.',
      requirements: 'Опыт кейтеринга от 2 лет, медицинская книжка, умение работать в условиях ограниченного оборудования.',
      conditions: '2 смены по 12 часов. Проживание и питание обеспечивается. Транспорт от Краснодара.',
      dressCode: 'Фартук и колпак (предоставляются)',
      experienceRequired: 2,
      foodProvided: true,
      transportProvided: true,
      tipsPossible: false,
      isUrgent: false,
      description: 'Кейтеринг на корпоративный выезд 150 человек. Двухдневное мероприятие в загородном клубе под Краснодаром.',
    },
    {
      slug: 'v-south-waiter-1',
      employerId: ep2.id,
      cityId: krasnodar.id,
      title: 'Официант на свадебный фуршет',
      category: StaffCategory.waiter,
      rate: 500,
      rateType: RateType.hourly,
      eventType: EventType.wedding,
      employmentType: EmploymentType.single_shift,
      dateStart: future(10),
      timeStart: '16:00',
      timeEnd: '00:00',
      status: VacancyStatus.active,
      workersNeeded: 5,
      responsibilities: 'Расстановка и пополнение фуршетных столов, разнос канапе и напитков, уборка посуды.',
      requirements: 'Аккуратность, вежливость, опыт на фуршетах желателен. Медкнижка.',
      conditions: 'Оплата в день мероприятия наличными или переводом. Ужин предоставляется.',
      dressCode: 'Чёрные брюки, белая рубашка (своя)',
      experienceRequired: 0,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: true,
      description: 'Срочно ищем 5 официантов на свадьбу. Выездной фуршет на 80 человек в коттеджном посёлке. Отличная команда!',
    },
    {
      slug: 'v-south-bartender-1',
      employerId: ep2.id,
      cityId: krasnodar.id,
      title: 'Бармен на серию корпоративов',
      category: StaffCategory.bartender,
      rate: 700,
      rateType: RateType.hourly,
      eventType: EventType.corporate,
      employmentType: EmploymentType.series,
      dateStart: future(20),
      dateEnd: future(50),
      timeStart: '18:00',
      timeEnd: '00:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Работа за мобильным баром, приготовление коктейлей и глинтвейна, общение с гостями.',
      requirements: 'Опыт от 3 лет, знание крепких напитков и вин, медицинская книжка, коммуникабельность.',
      conditions: 'Серия из 5 мероприятий в ноябре–декабре. Оплата после каждого события. Транспорт компании.',
      dressCode: 'Жилет и бабочка (предоставляются)',
      experienceRequired: 3,
      foodProvided: true,
      transportProvided: true,
      tipsPossible: true,
      isUrgent: false,
      description: 'Приглашаем бармена на новогоднюю серию корпоративов крупного холдинга. 5 мероприятий, стабильная оплата.',
    },

    // ── ep3 (Ресторан «Якорь») ─────────────────────────────────────────────
    {
      slug: 'v-yakor-sommelier-1',
      employerId: ep3.id,
      cityId: novorossiysk.id,
      title: 'Сомелье на винный вечер',
      category: StaffCategory.sommelier,
      rate: 1200,
      rateType: RateType.hourly,
      eventType: EventType.private_party,
      employmentType: EmploymentType.single_shift,
      dateStart: future(12),
      timeStart: '19:00',
      timeEnd: '23:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Презентация вин коллекции, рекомендации к блюдам, декантирование, ответы на вопросы гостей.',
      requirements: 'Сертификат сомелье (WSET или российский аналог), знание вин Старого и Нового Света, грамотная речь, опыт от 3 лет.',
      conditions: 'Оплата за вечер. Дегустационный ужин в подарок.',
      dressCode: 'Деловой костюм, собственный',
      experienceRequired: 3,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Ресторан «Якорь» организует закрытый винный вечер для 20 VIP-гостей. Нужен профессиональный сомелье для презентации нашей коллекции.',
    },
    {
      slug: 'v-yakor-waiter-1',
      employerId: ep3.id,
      cityId: novorossiysk.id,
      title: 'Официант в ресторан (постоянно)',
      category: StaffCategory.waiter,
      rate: 500,
      rateType: RateType.per_shift,
      eventType: EventType.banquet,
      employmentType: EmploymentType.permanent,
      dateStart: future(2),
      timeStart: '12:00',
      timeEnd: '00:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Обслуживание столиков в зале, приём заказов, работа с кассой, поддержание стандартов сервиса.',
      requirements: 'Опыт в ресторане от 2 лет, знание сервисных стандартов, медицинская книжка, ответственность.',
      conditions: 'График 2/2, 12-часовые смены. Обед за счёт заведения. Карьерный рост внутри ресторана.',
      dressCode: 'Форменная рубашка (предоставляется), чёрные брюки (свои)',
      experienceRequired: 2,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Ресторан «Якорь» на постоянной основе ищет двух официантов. Стабильный коллектив, хорошие чаевые, возможность роста до старшего официанта.',
    },
    {
      slug: 'v-yakor-cook-1',
      employerId: ep3.id,
      cityId: novorossiysk.id,
      title: 'Повар на корпоративный ужин',
      category: StaffCategory.cook,
      rate: 950,
      rateType: RateType.hourly,
      eventType: EventType.corporate,
      employmentType: EmploymentType.single_shift,
      dateStart: future(6),
      timeStart: '10:00',
      timeEnd: '22:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Приготовление блюд основного меню и специального корпоративного сет-меню, соблюдение тайминга подачи.',
      requirements: 'Опыт от 5 лет, знание средиземноморской кухни, медицинская книжка, аккуратность.',
      conditions: 'Оплата в день мероприятия. Питание предоставляется.',
      dressCode: 'Белый китель и колпак (предоставляются)',
      experienceRequired: 5,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Нужен опытный повар для корпоративного ужина на 40 гостей. Авторское меню уже разработано, нужен исполнитель высокого уровня.',
    },
  ];

  const createdVacancies: { id: string; status: VacancyStatus; employerId: string }[] = [];
  for (const v of vacanciesData) {
    const existing = await prisma.vacancy.findFirst({ where: { employerId: v.employerId, title: v.title } });
    if (existing) {
      createdVacancies.push({ id: existing.id, status: existing.status, employerId: existing.employerId });
      continue;
    }
    const vac = await prisma.vacancy.create({
      data: {
        employerId: v.employerId,
        cityId: v.cityId,
        title: v.title,
        category: v.category,
        rate: v.rate,
        rateType: v.rateType,
        eventType: v.eventType,
        employmentType: v.employmentType,
        dateStart: v.dateStart,
        dateEnd: v.dateEnd,
        timeStart: v.timeStart,
        timeEnd: v.timeEnd,
        status: v.status,
        workersNeeded: v.workersNeeded,
        responsibilities: v.responsibilities,
        requirements: v.requirements,
        conditions: v.conditions,
        dressCode: v.dressCode,
        experienceRequired: v.experienceRequired,
        foodProvided: v.foodProvided,
        transportProvided: v.transportProvided,
        tipsPossible: v.tipsPossible,
        isUrgent: v.isUrgent,
        description: v.description,
        publishedAt: v.status === VacancyStatus.active ? now : undefined,
        viewsCount: Math.floor(Math.random() * 80) + 10,
      },
    });
    createdVacancies.push({ id: vac.id, status: vac.status, employerId: vac.employerId });
  }
  console.log('✅ 9 vacancies created (3 per employer)');

  // ─── Applications ─────────────────────────────────────────────────────────
  const activeVacIds = createdVacancies.filter(v => v.status === VacancyStatus.active).map(v => v.id);

  const appSeeds = [
    { workerId: wp1.id, vacIdx: 1, status: ApplicationStatus.confirmed, msg: 'Здравствуйте! Работала на похожих мероприятиях, знаю весь ассортимент коктейлей. Буду рада сотрудничеству.' },
    { workerId: wp1.id, vacIdx: 4, status: ApplicationStatus.pending, msg: 'Опыт кейтеринга есть, медкнижка в наличии. Готова к двухдневной работе.' },
    { workerId: wp2.id, vacIdx: 0, status: ApplicationStatus.confirmed, msg: 'Работаю официантом 4 года, есть опыт на свадьбах. Медицинская книжка есть.' },
    { workerId: wp2.id, vacIdx: 3, status: ApplicationStatus.pending, msg: 'Хочу попробовать кейтеринговый формат, есть опыт на выездных банкетах.' },
    { workerId: wp3.id, vacIdx: 3, status: ApplicationStatus.confirmed, msg: 'Шеф-повар, 8 лет опыта кейтеринга. Умею работать в полевых условиях.' },
    { workerId: wp3.id, vacIdx: 7, status: ApplicationStatus.pending, msg: 'Отличный опыт в ресторане, хочу попробоваться на постоянную позицию.' },
    { workerId: wp2.id, vacIdx: 7, status: ApplicationStatus.invited, msg: 'Опыт в ресторанах 4 года, ищу постоянное место.' },
    { workerId: wp1.id, vacIdx: 5, status: ApplicationStatus.pending, msg: 'Опыт серийных мероприятий есть, готова к ноябрьско-декабрьским корпоративам.' },
  ];

  for (const a of appSeeds) {
    const vacId = activeVacIds[a.vacIdx % activeVacIds.length];
    if (!vacId) continue;
    const exists = await prisma.application.findUnique({
      where: { vacancyId_workerId: { vacancyId: vacId, workerId: a.workerId } },
    });
    if (!exists) {
      await prisma.application.create({
        data: { vacancyId: vacId, workerId: a.workerId, status: a.status, coverMessage: a.msg },
      });
    }
  }
  console.log('✅ Applications created');

  // ─── Reviews ───────────────────────────────────────────────────────────────
  const reviewSeeds = [
    {
      authorId: empUser1.id,
      targetId: wUser1.id,
      targetType: ReviewTargetType.worker,
      rating: 5,
      text: 'Анна — настоящий профессионал! Работала быстро, без ошибок, гости были в восторге от коктейлей. Обязательно пригласим снова.',
      status: ReviewStatus.approved,
    },
    {
      authorId: empUser3.id,
      targetId: wUser1.id,
      targetType: ReviewTargetType.worker,
      rating: 5,
      text: 'Отличный бармен, знает своё дело. Пунктуальна, вежлива с гостями, следит за запасами самостоятельно.',
      status: ReviewStatus.approved,
    },
    {
      authorId: empUser2.id,
      targetId: wUser2.id,
      targetType: ReviewTargetType.worker,
      rating: 5,
      text: 'Дмитрий отработал смену на отлично. Ни одной жалобы, работал слаженно в команде. Рекомендуем!',
      status: ReviewStatus.approved,
    },
    {
      authorId: empUser1.id,
      targetId: wUser2.id,
      targetType: ReviewTargetType.worker,
      rating: 4,
      text: 'Хороший официант, аккуратный. Небольшой минус — чуть медленно в пиковые моменты, но в целом достойно.',
      status: ReviewStatus.approved,
    },
    {
      authorId: empUser2.id,
      targetId: wUser3.id,
      targetType: ReviewTargetType.worker,
      rating: 5,
      text: 'Алексей — исключительный повар. Блюда были приготовлены идеально, тайминг соблюдён. Гости спрашивали контакты повара!',
      status: ReviewStatus.approved,
    },
    {
      authorId: empUser3.id,
      targetId: wUser3.id,
      targetType: ReviewTargetType.worker,
      rating: 5,
      text: 'Работали вместе несколько раз — каждый раз на высшем уровне. Профессиональный подход, чистота на кухне, отличный результат.',
      status: ReviewStatus.approved,
    },
    {
      authorId: wUser2.id,
      targetId: empUser1.id,
      targetType: ReviewTargetType.employer,
      rating: 5,
      text: 'Организованный работодатель: всё объяснили заранее, обеспечили питанием, заплатили точно в срок. Буду работать ещё!',
      status: ReviewStatus.approved,
    },
    {
      authorId: wUser1.id,
      targetId: empUser3.id,
      targetType: ReviewTargetType.employer,
      rating: 5,
      text: 'Прекрасные условия работы, внимательный менеджер. Ресторан «Якорь» — топовый работодатель в городе.',
      status: ReviewStatus.approved,
    },
  ];

  for (const r of reviewSeeds) {
    const exists = await prisma.review.findFirst({
      where: { authorId: r.authorId, targetId: r.targetId, targetType: r.targetType },
    });
    if (!exists) {
      await prisma.review.create({ data: r });
    }
  }
  console.log('✅ Reviews created');

  // ─── Conversations & Messages ──────────────────────────────────────────────
  const convSeeds = [
    {
      userIds: [empUser1.id, wUser1.id],
      messages: [
        { from: empUser1.id, to: wUser1.id, text: 'Анна, здравствуйте! Видели ваш профиль. Рассматриваете ли предложение на корпоратив 14-го числа?' },
        { from: wUser1.id, to: empUser1.id, text: 'Добрый день! Да, интересно. Расскажите подробнее — сколько гостей, какой формат?' },
        { from: empUser1.id, to: wUser1.id, text: '60 гостей, корпоратив IT-компании. Работа с мобильным баром, с 17:00 до 23:00. Оплата 750 руб/час.' },
        { from: wUser1.id, to: empUser1.id, text: 'Меня устраивают условия. Подтверждаю участие. Что нужно взять с собой?' },
        { from: empUser1.id, to: wUser1.id, text: 'Форму предоставим. Возьмите медкнижку. Ждём вас в 16:30 для брифинга.' },
      ],
    },
    {
      userIds: [empUser3.id, wUser2.id],
      messages: [
        { from: empUser3.id, to: wUser2.id, text: 'Дмитрий, добрый день. Ищем постоянного официанта в наш ресторан. Заинтересованы?' },
        { from: wUser2.id, to: empUser3.id, text: 'Здравствуйте! Да, интересует. У вас какой график?' },
        { from: empUser3.id, to: wUser2.id, text: 'График 2/2, 12-часовые смены. Оплата посменная + чаевые. Обед за счёт заведения.' },
        { from: wUser2.id, to: empUser3.id, text: 'Звучит хорошо. Когда можно подъехать на собеседование?' },
        { from: empUser3.id, to: wUser2.id, text: 'Приходите в любой будний день с 10 до 15. Спросите Дмитрия Морозова.' },
      ],
    },
    {
      userIds: [empUser2.id, wUser3.id],
      messages: [
        { from: empUser2.id, to: wUser3.id, text: 'Алексей, приветствую! У нас двухдневный кейтеринг через 5 дней. Не заняты?' },
        { from: wUser3.id, to: empUser2.id, text: 'Добрый день, Андрей! Свободен. Что за мероприятие?' },
        { from: empUser2.id, to: wUser3.id, text: 'Корпоратив 150 человек в загородном клубе. 2 смены по 12 часов. Проживание и питание наше.' },
        { from: wUser3.id, to: empUser2.id, text: 'Беру. Вышлите ТЗ с меню — хочу подготовиться заранее.' },
        { from: empUser2.id, to: wUser3.id, text: 'Отлично! Направляю техкарты на email. Встречаемся в 7:45 у офиса компании.' },
      ],
    },
  ];

  for (const conv of convSeeds) {
    const existing = await prisma.conversation.findFirst({
      where: { participantIds: { hasEvery: conv.userIds } },
    });
    const conversation = existing ?? (await prisma.conversation.create({
      data: { participantIds: conv.userIds, lastMessageAt: new Date() },
    }));
    for (const msg of conv.messages) {
      const dup = await prisma.message.findFirst({
        where: { conversationId: conversation.id, content: msg.text },
      });
      if (!dup) {
        await prisma.message.create({
          data: { conversationId: conversation.id, senderId: msg.from, receiverId: msg.to, content: msg.text },
        });
      }
    }
  }
  console.log('✅ Conversations & messages created');

  // ─── Favorites ────────────────────────────────────────────────────────────
  const activeVacs = createdVacancies.filter(v => v.status === VacancyStatus.active);
  const favSeeds = [
    { userId: wUser1.id, targetId: activeVacs[1]?.id, type: 'vacancy' },
    { userId: wUser1.id, targetId: activeVacs[4]?.id, type: 'vacancy' },
    { userId: wUser1.id, targetId: activeVacs[6]?.id, type: 'vacancy' },
    { userId: wUser2.id, targetId: activeVacs[0]?.id, type: 'vacancy' },
    { userId: wUser2.id, targetId: activeVacs[7]?.id, type: 'vacancy' },
    { userId: wUser3.id, targetId: activeVacs[3]?.id, type: 'vacancy' },
    { userId: wUser3.id, targetId: activeVacs[8]?.id, type: 'vacancy' },
    { userId: empUser1.id, targetId: wp2.id, type: 'worker' },
    { userId: empUser1.id, targetId: wp3.id, type: 'worker' },
    { userId: empUser2.id, targetId: wp1.id, type: 'worker' },
    { userId: empUser2.id, targetId: wp3.id, type: 'worker' },
    { userId: empUser3.id, targetId: wp1.id, type: 'worker' },
    { userId: empUser3.id, targetId: wp2.id, type: 'worker' },
  ];

  for (const fav of favSeeds) {
    if (!fav.targetId) continue;
    await prisma.favorite.upsert({
      where: { userId_targetId_type: { userId: fav.userId, targetId: fav.targetId, type: fav.type } },
      create: { userId: fav.userId, targetId: fav.targetId, type: fav.type },
      update: {},
    });
  }
  console.log('✅ Favorites created');

  // ─── Worker Availability (next 30 days) ───────────────────────────────────
  const workers = [
    { profile: wp1, busyDays: [1, 4, 7, 14, 21] },
    { profile: wp2, busyDays: [2, 5, 10, 17] },
    { profile: wp3, busyDays: [3, 6, 12, 20, 25] },
  ];
  for (const { profile, busyDays } of workers) {
    for (let d = 1; d <= 30; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      date.setHours(0, 0, 0, 0);
      await prisma.workerAvailability.upsert({
        where: { workerId_date: { workerId: profile.id, date } },
        create: { workerId: profile.id, date, isBooked: busyDays.includes(d), isBlocked: false },
        update: {},
      });
    }
  }
  console.log('✅ Availability created');

  // ─── Stage 2: cancellation reasons ─────────────────────────────────────────
  const workerCancel = [
    { code: 'PERSONAL_EMERGENCY', label: 'Личные обстоятельства', sortOrder: 10 },
    { code: 'HEALTH_ISSUE', label: 'Состояние здоровья', sortOrder: 20 },
    { code: 'FOUND_OTHER_JOB', label: 'Нашёл другую работу', sortOrder: 30 },
    { code: 'TRANSPORT_ISSUE', label: 'Проблемы с транспортом', sortOrder: 40 },
    { code: 'SALARY_MISMATCH', label: 'Не устроила оплата', sortOrder: 50 },
    { code: 'WORKER_OTHER', label: 'Другое (свободный ввод)', sortOrder: 90 },
  ];
  for (const r of workerCancel) {
    await prisma.cancellationReason.upsert({
      where: { code: r.code },
      create: {
        role: Role.worker,
        code: r.code,
        label: r.label,
        sortOrder: r.sortOrder,
        isSystem: true,
        isActive: true,
      },
      update: { label: r.label, sortOrder: r.sortOrder, isActive: true },
    });
  }

  const employerCancel = [
    { code: 'EVENT_CANCELLED', label: 'Мероприятие отменено', sortOrder: 10 },
    { code: 'STAFF_NOT_NEEDED', label: 'Персонал больше не нужен', sortOrder: 20 },
    { code: 'WRONG_PROFILE', label: 'Профиль не подошёл', sortOrder: 30 },
    { code: 'BUDGET_CHANGE', label: 'Изменение бюджета', sortOrder: 40 },
    { code: 'DATE_CHANGED', label: 'Изменились даты', sortOrder: 50 },
    { code: 'EMPLOYER_OTHER', label: 'Другое (свободный ввод)', sortOrder: 90 },
  ];
  for (const r of employerCancel) {
    await prisma.cancellationReason.upsert({
      where: { code: r.code },
      create: {
        role: Role.employer,
        code: r.code,
        label: r.label,
        sortOrder: r.sortOrder,
        isSystem: true,
        isActive: true,
      },
      update: { label: r.label, sortOrder: r.sortOrder, isActive: true },
    });
  }
  console.log('✅ Cancellation reasons (stage 2)');

  // ─── Stage 2: reliability + review subscription for every user ──────────
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const { id } of allUsers) {
    await prisma.userReliabilityScore.upsert({
      where: { userId: id },
      create: {
        userId: id,
        level: ReliabilityLevel.NEW,
        score: 100,
        totalShifts: 0,
        successfulShifts: 0,
        failedShifts: 0,
        cancelledShifts: 0,
        strikeCount: 0,
        isRestricted: false,
      },
      update: {},
    });
    await prisma.userReviewSubscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        plan: UserReviewPlan.FREE,
        reviewsLimit: 3,
        reviewsUsed: 0,
      },
      update: {},
    });
  }
  console.log('✅ UserReliabilityScore + UserReviewSubscription for all users');

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Seeding complete!\n');
  // ─── Additional Employers (for new vacancies) ────────────────────────────
  const empHash2 = await bcrypt.hash('Test1234!', BCRYPT_ROUNDS);

  const empUser4 = await prisma.user.upsert({
    where: { email: 'catering.novo@test.ru' },
    create: { email: 'catering.novo@test.ru', passwordHash: empHash2, activeRole: Role.employer, emailVerified: true, roles: { create: { role: Role.employer } } },
    update: {},
  });
  const ep4 = await prisma.employerProfile.upsert({
    where: { userId: empUser4.id },
    create: {
      userId: empUser4.id,
      slug: 'emp-catering-novo',
      type: EmployerType.company,
      companyName: 'Кейтеринг Новороссийск',
      contactName: 'Светлана Иванова',
      businessType: BusinessType.catering,
      cityId: novorossiysk.id,
      inn: '2315019876',
      description: 'Профессиональный кейтеринг по Новороссийску и Краснодарскому краю. Свадьбы, корпоративы, частные мероприятия. Собственная кухня и оборудование.',
      isVerified: true,
      verifiedAt: new Date('2024-04-01'),
      reliabilityScore: 90,
      responseRate: 88,
      ratingScore: 4.7,
    },
    update: { isVerified: true },
  });

  const empUser5 = await prisma.user.upsert({
    where: { email: 'marina.events@test.ru' },
    create: { email: 'marina.events@test.ru', passwordHash: empHash2, activeRole: Role.employer, emailVerified: true, roles: { create: { role: Role.employer } } },
    update: {},
  });
  const ep5 = await prisma.employerProfile.upsert({
    where: { userId: empUser5.id },
    create: {
      userId: empUser5.id,
      slug: 'emp-marina-events',
      type: EmployerType.company,
      companyName: 'Marina Events',
      contactName: 'Марина Соколова',
      businessType: BusinessType.event_agency,
      cityId: novorossiysk.id,
      inn: '2315054321',
      description: 'Event-агентство полного цикла. Организация свадеб, корпоративов, фестивалей. Работаем с лучшими специалистами города.',
      isVerified: true,
      verifiedAt: new Date('2024-03-10'),
      reliabilityScore: 93,
      responseRate: 95,
      ratingScore: 4.8,
    },
    update: { isVerified: true },
  });

  console.log('✅ 2 additional employers created');

  // ─── Additional Workers (15 new) ─────────────────────────────────────────
  const workHash2 = await bcrypt.hash('Worker1234!', BCRYPT_ROUNDS);

  const newWorkersData = [
    {
      email: 'anna.sokolova@test.ru',
      slug: 'worker-anna-sokolova',
      firstName: 'Анна',
      lastName: 'Соколова',
      age: 26,
      bio: 'Работала в премиум-ресторанах. Спокойная, внимательная, грамотная речь. Английский — Intermediate.',
      desiredRate: 500,
      experienceYears: 4,
      ratingScore: 4.9,
      totalReviews: 32,
      totalShifts: 95,
      isVerified: true,
      categories: [{ cat: StaffCategory.waiter, lvl: WorkerLevel.experienced }, { cat: StaffCategory.hostess, lvl: WorkerLevel.experienced }],
    },
    {
      email: 'dmitry.kravtsov@test.ru',
      slug: 'worker-dmitry-kravtsov',
      firstName: 'Дмитрий',
      lastName: 'Кравцов',
      age: 31,
      bio: 'Авторские коктейли, флейринг, опыт работы на крупных фестивалях.',
      desiredRate: 700,
      experienceYears: 7,
      ratingScore: 4.8,
      totalReviews: 47,
      totalShifts: 130,
      isVerified: true,
      categories: [{ cat: StaffCategory.bartender, lvl: WorkerLevel.expert }],
    },
    {
      email: 'maria.vlasova@test.ru',
      slug: 'worker-maria-vlasova',
      firstName: 'Мария',
      lastName: 'Власова',
      age: 24,
      bio: 'Хостес и координатор на мероприятиях любого масштаба. Всегда на позитиве, чёткий тайминг.',
      desiredRate: 600,
      experienceYears: 3,
      ratingScore: 4.7,
      totalReviews: 21,
      totalShifts: 68,
      isVerified: true,
      categories: [{ cat: StaffCategory.hostess, lvl: WorkerLevel.experienced }, { cat: StaffCategory.coordinator, lvl: WorkerLevel.experienced }],
    },
    {
      email: 'alex.volkov@test.ru',
      slug: 'worker-alex-volkov',
      firstName: 'Александр',
      lastName: 'Волков',
      age: 29,
      bio: 'Холодный и горячий цех, банкетная кухня от 50 до 500 человек.',
      desiredRate: 900,
      experienceYears: 6,
      ratingScore: 4.9,
      totalReviews: 38,
      totalShifts: 110,
      isVerified: true,
      categories: [{ cat: StaffCategory.cook, lvl: WorkerLevel.expert }],
    },
    {
      email: 'ekaterina.novikova@test.ru',
      slug: 'worker-ekaterina-novikova',
      firstName: 'Екатерина',
      lastName: 'Новикова',
      age: 27,
      bio: 'Администратор зала с 5-летним опытом. Контроль команды, работа с гостями, решение нестандартных ситуаций.',
      desiredRate: 800,
      experienceYears: 5,
      ratingScore: 4.8,
      totalReviews: 29,
      totalShifts: 88,
      isVerified: true,
      categories: [{ cat: StaffCategory.administrator, lvl: WorkerLevel.experienced }],
    },
    {
      email: 'ivan.morozov@test.ru',
      slug: 'worker-ivan-morozov',
      firstName: 'Иван',
      lastName: 'Морозов',
      age: 22,
      bio: 'Молодой, обучаемый, готов к ночным сменам.',
      desiredRate: 400,
      experienceYears: 1,
      ratingScore: 4.5,
      totalReviews: 8,
      totalShifts: 22,
      isVerified: false,
      categories: [{ cat: StaffCategory.waiter, lvl: WorkerLevel.beginner }],
    },
    {
      email: 'olga.petrova@test.ru',
      slug: 'worker-olga-petrova',
      firstName: 'Ольга',
      lastName: 'Петрова',
      age: 33,
      bio: 'Координатор мероприятий высшего класса. 9 лет в индустрии, вела свадьбы, корпоративы, выставки.',
      desiredRate: 1200,
      experienceYears: 9,
      ratingScore: 4.9,
      totalReviews: 42,
      totalShifts: 140,
      isVerified: true,
      categories: [{ cat: StaffCategory.coordinator, lvl: WorkerLevel.expert }],
    },
    {
      email: 'sergey.lebedev@test.ru',
      slug: 'worker-sergey-lebedev',
      firstName: 'Сергей',
      lastName: 'Лебедев',
      age: 28,
      bio: 'Технический специалист на мероприятиях. Монтаж/демонтаж оборудования, свет, звук.',
      desiredRate: 600,
      experienceYears: 5,
      ratingScore: 4.7,
      totalReviews: 19,
      totalShifts: 75,
      isVerified: true,
      categories: [{ cat: StaffCategory.technical, lvl: WorkerLevel.experienced }],
    },
    {
      email: 'victoria.zaitseva@test.ru',
      slug: 'worker-victoria-zaitseva',
      firstName: 'Виктория',
      lastName: 'Зайцева',
      age: 25,
      bio: 'Бармен с опытом работы в коктейльных барах и на выездных мероприятиях.',
      desiredRate: 600,
      experienceYears: 3,
      ratingScore: 4.6,
      totalReviews: 15,
      totalShifts: 52,
      isVerified: true,
      categories: [{ cat: StaffCategory.bartender, lvl: WorkerLevel.experienced }],
    },
    {
      email: 'nikita.romanov@test.ru',
      slug: 'worker-nikita-romanov',
      firstName: 'Никита',
      lastName: 'Романов',
      age: 30,
      bio: 'Свадьбы, корпоративы, клубные сеты. Своё оборудование.',
      desiredRate: 2200,
      experienceYears: 8,
      ratingScore: 4.8,
      totalReviews: 34,
      totalShifts: 105,
      isVerified: true,
      categories: [{ cat: StaffCategory.dj, lvl: WorkerLevel.expert }],
    },
    {
      email: 'tatyana.efimova@test.ru',
      slug: 'worker-tatyana-efimova',
      firstName: 'Татьяна',
      lastName: 'Ефимова',
      age: 36,
      bio: 'Банкетный менеджер с 12-летним опытом. Организация и контроль мероприятий от 50 до 1000 человек.',
      desiredRate: 1400,
      experienceYears: 12,
      ratingScore: 4.9,
      totalReviews: 41,
      totalShifts: 150,
      isVerified: true,
      categories: [{ cat: StaffCategory.banquet_manager, lvl: WorkerLevel.expert }],
    },
    {
      email: 'artem.belov@test.ru',
      slug: 'worker-artem-belov',
      firstName: 'Артём',
      lastName: 'Белов',
      age: 23,
      bio: 'Официант и техник на мероприятиях. Работоспособный, пунктуальный.',
      desiredRate: 450,
      experienceYears: 2,
      ratingScore: 4.4,
      totalReviews: 11,
      totalShifts: 35,
      isVerified: false,
      categories: [{ cat: StaffCategory.waiter, lvl: WorkerLevel.beginner }, { cat: StaffCategory.technical, lvl: WorkerLevel.beginner }],
    },
    {
      email: 'yulia.semenova@test.ru',
      slug: 'worker-yulia-semenova',
      firstName: 'Юлия',
      lastName: 'Семёнова',
      age: 28,
      bio: 'Английский — Upper-Intermediate, презентабельная внешность.',
      desiredRate: 550,
      experienceYears: 4,
      ratingScore: 4.7,
      totalReviews: 23,
      totalShifts: 78,
      isVerified: true,
      categories: [{ cat: StaffCategory.hostess, lvl: WorkerLevel.experienced }],
    },
    {
      email: 'maxim.grigoriev@test.ru',
      slug: 'worker-maxim-grigoriev',
      firstName: 'Максим',
      lastName: 'Григорьев',
      age: 26,
      bio: 'Кассир и администратор на мероприятиях. Работа с терминалами, организация входной группы.',
      desiredRate: 500,
      experienceYears: 3,
      ratingScore: 4.6,
      totalReviews: 14,
      totalShifts: 48,
      isVerified: true,
      categories: [{ cat: StaffCategory.administrator, lvl: WorkerLevel.beginner }, { cat: StaffCategory.other, lvl: WorkerLevel.beginner }],
    },
    {
      email: 'daria.orlova@test.ru',
      slug: 'worker-daria-orlova',
      firstName: 'Дарья',
      lastName: 'Орлова',
      age: 21,
      bio: 'Гардеробщик и хостес. Вежливая, аккуратная, ответственная.',
      desiredRate: 350,
      experienceYears: 1,
      ratingScore: 4.5,
      totalReviews: 7,
      totalShifts: 18,
      isVerified: false,
      categories: [{ cat: StaffCategory.hostess, lvl: WorkerLevel.beginner }, { cat: StaffCategory.other, lvl: WorkerLevel.beginner }],
    },
  ] as const;

  const newWorkerProfiles: { id: string; email: string }[] = [];
  for (const w of newWorkersData) {
    const u = await prisma.user.upsert({
      where: { email: w.email },
      create: { email: w.email, passwordHash: workHash2, activeRole: Role.worker, emailVerified: true, roles: { create: { role: Role.worker } } },
      update: {},
    });
    const wp = await prisma.workerProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        slug: w.slug,
        firstName: w.firstName,
        lastName: w.lastName,
        age: w.age,
        cityId: novorossiysk.id,
        bio: w.bio,
        desiredRate: w.desiredRate,
        rateType: RateType.hourly,
        experienceYears: w.experienceYears,
        hasMedicalBook: true,
        willingToTravel: true,
        overtimeReady: false,
        visibility: Visibility.public,
        isVerified: w.isVerified,
        verifiedAt: w.isVerified ? new Date('2024-06-01') : null,
        ratingScore: w.ratingScore,
        totalReviews: w.totalReviews,
        totalShifts: w.totalShifts,
        languages: ['Русский'],
      },
      update: { ratingScore: w.ratingScore, totalReviews: w.totalReviews, isVerified: w.isVerified },
    });
    for (const c of w.categories) {
      await prisma.workerCategory.upsert({
        where: { workerId_category: { workerId: wp.id, category: c.cat } },
        create: { workerId: wp.id, category: c.cat, level: c.lvl },
        update: { level: c.lvl },
      });
    }
    newWorkerProfiles.push({ id: wp.id, email: w.email });
  }
  console.log('✅ 15 additional workers created');

  // ─── Additional Vacancies (15 new, all in Novorossiysk) ───────────────────
  const newVacanciesData = [
    {
      employerId: ep1.id,
      title: 'Официанты на банкет в честь юбилея',
      category: StaffCategory.waiter,
      rate: 450,
      rateType: RateType.hourly,
      eventType: EventType.birthday,
      employmentType: EmploymentType.single_shift,
      dateStart: future(3),
      timeStart: '15:00',
      timeEnd: '23:00',
      status: VacancyStatus.active,
      workersNeeded: 3,
      responsibilities: 'Сервировка и уборка столов, подача блюд и напитков, обслуживание гостей по стандартам банкетного сервиса.',
      requirements: 'Опыт работы официантом от 1 года, медицинская книжка, аккуратный внешний вид, стрессоустойчивость.',
      conditions: 'Почасовая оплата, питание за счёт работодателя. Оплата в день мероприятия.',
      dressCode: 'Белая рубашка, чёрные брюки (свои), фартук предоставляется',
      experienceRequired: 1,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: true,
      description: 'Срочно требуются 3 официанта на банкет по случаю юбилея. 80 гостей, 8 часов работы. Опытная организация, чёткий тайминг.',
    },
    {
      employerId: ep1.id,
      title: 'Бармен на корпоратив крупной компании',
      category: StaffCategory.bartender,
      rate: 600,
      rateType: RateType.hourly,
      eventType: EventType.corporate,
      employmentType: EmploymentType.single_shift,
      dateStart: future(10),
      timeStart: '17:00',
      timeEnd: '23:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Работа за мобильным баром, приготовление коктейлей и безалкогольных напитков, поддержание порядка на баре.',
      requirements: 'Опыт работы в коктейльном баре от 2 лет, базовый английский, медицинская книжка.',
      conditions: 'Форма от заказчика. Почасовая оплата. Ужин предоставляется.',
      dressCode: 'Форма работодателя (предоставляется)',
      experienceRequired: 2,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Приглашаем опытного бармена на корпоратив крупной производственной компании. 100 гостей, авторская коктейльная карта.',
    },
    {
      employerId: ep3.id,
      title: 'Хостес на встречу гостей выставки',
      category: StaffCategory.hostess,
      rate: 500,
      rateType: RateType.hourly,
      eventType: EventType.conference,
      employmentType: EmploymentType.single_shift,
      dateStart: future(14),
      timeStart: '09:00',
      timeEnd: '14:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Встреча и регистрация гостей выставки, раздача программ, навигация по площадке, помощь участникам.',
      requirements: 'Презентабельная внешность, грамотная речь, пунктуальность. Опыт в сфере гостеприимства приветствуется.',
      conditions: 'Почасовая оплата. Обед за счёт организатора.',
      dressCode: 'Деловой стиль (костюм предоставляется)',
      experienceRequired: 0,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Ищем 2 хостес на региональную бизнес-выставку. 300 участников, работа у стоек регистрации.',
    },
    {
      employerId: ep3.id,
      title: 'Повар холодного цеха на свадьбу',
      category: StaffCategory.cook,
      rate: 800,
      rateType: RateType.hourly,
      eventType: EventType.wedding,
      employmentType: EmploymentType.single_shift,
      dateStart: future(8),
      timeStart: '10:00',
      timeEnd: '20:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Приготовление холодных закусок, нарезок, оформление блюд по банкетным стандартам. Соблюдение санитарных норм.',
      requirements: 'Опыт работы в банкетной кухне от 2 лет, медицинская книжка, аккуратность.',
      conditions: 'Оплата в день мероприятия. Питание за счёт работодателя.',
      dressCode: 'Белый китель и колпак (предоставляются)',
      experienceRequired: 2,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Нужен повар холодного цеха на свадебный банкет 120 гостей. Меню уже разработано, нужен исполнитель.',
    },
    {
      employerId: ep4.id,
      title: 'Координатор мероприятия — открытие отеля',
      category: StaffCategory.coordinator,
      rate: 1200,
      rateType: RateType.hourly,
      eventType: EventType.other,
      employmentType: EmploymentType.single_shift,
      dateStart: future(18),
      timeStart: '10:00',
      timeEnd: '18:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Координация всех участников мероприятия, контроль таймингов, взаимодействие с командами гостей и персонала.',
      requirements: 'Опыт ведения мероприятий от 3 лет, организаторские навыки, английский разговорный, стрессоустойчивость.',
      conditions: 'Почасовая оплата. Питание предоставляется.',
      dressCode: 'Деловой стиль',
      experienceRequired: 3,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Требуется опытный координатор на торжественное открытие нового отеля. Ответственная работа, высокий уровень события.',
    },
    {
      employerId: ep4.id,
      title: 'Бригада официантов на летнюю террасу',
      category: StaffCategory.waiter,
      rate: 400,
      rateType: RateType.hourly,
      eventType: EventType.other,
      employmentType: EmploymentType.series,
      dateStart: future(7),
      dateEnd: future(21),
      timeStart: '12:00',
      timeEnd: '22:00',
      status: VacancyStatus.active,
      workersNeeded: 4,
      responsibilities: 'Обслуживание гостей на летней террасе: приём заказов, подача еды и напитков, поддержание чистоты.',
      requirements: 'Опыт работы официантом, коммуникабельность, медицинская книжка.',
      conditions: 'Серия смен в течение 2 недель. График обсуждается. Почасовая оплата.',
      dressCode: 'Чёрная форма (своя)',
      experienceRequired: 0,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Нужна бригада из 4 официантов на обслуживание летней террасы ресторана. Регулярные смены в течение 2 недель.',
    },
    {
      employerId: ep5.id,
      title: 'Бармен на пляжную вечеринку',
      category: StaffCategory.bartender,
      rate: 700,
      rateType: RateType.hourly,
      eventType: EventType.private_party,
      employmentType: EmploymentType.single_shift,
      dateStart: future(5),
      timeStart: '17:00',
      timeEnd: '00:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Приготовление авторских коктейлей и безалкогольных напитков, работа с кассой, поддержание чистоты на баре.',
      requirements: 'Знание авторских коктейлей, опыт работы на open-air мероприятиях от 2 лет, медицинская книжка.',
      conditions: 'Почасовая оплата. Доставка до места предоставляется.',
      dressCode: 'Тематическая пляжная форма (предоставляется)',
      experienceRequired: 2,
      foodProvided: true,
      transportProvided: true,
      tipsPossible: true,
      isUrgent: true,
      description: 'Срочно! Бармен на пляжную вечеринку 150 гостей. Авторский коктейльный бар, 7 часов работы.',
    },
    {
      employerId: ep5.id,
      title: 'Администратор зала на свадебный банкет',
      category: StaffCategory.administrator,
      rate: 900,
      rateType: RateType.hourly,
      eventType: EventType.wedding,
      employmentType: EmploymentType.single_shift,
      dateStart: future(12),
      timeStart: '12:00',
      timeEnd: '00:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Контроль работы команды официантов, взаимодействие с молодожёнами, решение организационных вопросов, тайминг.',
      requirements: 'Опыт администратора на мероприятиях от 3 лет, лидерские качества, стрессоустойчивость.',
      conditions: 'Оплата по факту. Питание предоставляется.',
      dressCode: 'Деловой костюм (свой)',
      experienceRequired: 3,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Ищем администратора зала на свадьбу 180 гостей. Нужен опытный специалист, умеющий управлять командой.',
    },
    {
      employerId: ep4.id,
      title: 'Кассир на фуд-фестивале',
      category: StaffCategory.other,
      rate: 350,
      rateType: RateType.hourly,
      eventType: EventType.festival,
      employmentType: EmploymentType.single_shift,
      dateStart: future(9),
      timeStart: '11:00',
      timeEnd: '17:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Работа на кассовом терминале, приём оплаты, выдача чеков, учёт продаж.',
      requirements: 'Опыт работы с кассовым терминалом, внимательность, честность, пунктуальность.',
      conditions: 'Почасовая оплата. Обед за счёт организатора.',
      dressCode: 'Повседневный аккуратный стиль',
      experienceRequired: 0,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Приглашаем кассиров на городской фуд-фестиваль. Работа на терминале оплаты, удобный график.',
    },
    {
      employerId: ep5.id,
      title: 'DJ для корпоративного праздника',
      category: StaffCategory.dj,
      rate: 2500,
      rateType: RateType.hourly,
      eventType: EventType.corporate,
      employmentType: EmploymentType.single_shift,
      dateStart: future(20),
      timeStart: '19:00',
      timeEnd: '23:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Музыкальное сопровождение корпоративного праздника: фоновая музыка, дискотека, работа с заявками гостей.',
      requirements: 'Опыт работы DJ от 3 лет, наличие собственного оборудования, разнообразный музыкальный репертуар.',
      conditions: 'Фиксированная оплата за вечер (рассчитывается из ставки). Парковка обеспечивается.',
      dressCode: 'Деловой стиль',
      experienceRequired: 3,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Нужен профессиональный DJ на корпоратив 120 человек. 4 часа работы, собственное оборудование обязательно.',
    },
    {
      employerId: ep4.id,
      title: 'Технический персонал на конференцию',
      category: StaffCategory.technical,
      rate: 500,
      rateType: RateType.hourly,
      eventType: EventType.conference,
      employmentType: EmploymentType.single_shift,
      dateStart: future(11),
      timeStart: '08:00',
      timeEnd: '16:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Монтаж и демонтаж оборудования, настройка звука и освещения, техническая поддержка во время мероприятия.',
      requirements: 'Опыт технического обслуживания мероприятий, знание работы с аудио/видео оборудованием, физическая выносливость.',
      conditions: 'Почасовая оплата. Обед за счёт работодателя.',
      dressCode: 'Удобная рабочая одежда',
      experienceRequired: 1,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Нужны 2 технических специалиста на деловую конференцию 200 участников. Монтаж/демонтаж оборудования.',
    },
    {
      employerId: ep1.id,
      title: 'Гардеробщик на новогодний корпоратив',
      category: StaffCategory.other,
      rate: 300,
      rateType: RateType.hourly,
      eventType: EventType.corporate,
      employmentType: EmploymentType.single_shift,
      dateStart: future(25),
      timeStart: '18:00',
      timeEnd: '00:00',
      status: VacancyStatus.active,
      workersNeeded: 2,
      responsibilities: 'Приём и выдача верхней одежды, поддержание порядка в гардеробе, вежливое обслуживание гостей.',
      requirements: 'Аккуратность, ответственность, вежливость с гостями.',
      conditions: 'Почасовая оплата. Ужин предоставляется.',
      dressCode: 'Чёрная форма (предоставляется)',
      experienceRequired: 0,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Ищем 2 гардеробщиков на новогодний корпоратив 150 гостей. Работа 6 часов, хорошие условия.',
    },
    {
      employerId: ep5.id,
      title: 'Банкетный менеджер на свадьбу 200 человек',
      category: StaffCategory.banquet_manager,
      rate: 1500,
      rateType: RateType.hourly,
      eventType: EventType.wedding,
      employmentType: EmploymentType.single_shift,
      dateStart: future(16),
      timeStart: '10:00',
      timeEnd: '00:00',
      status: VacancyStatus.active,
      workersNeeded: 1,
      responsibilities: 'Полная организация и контроль проведения банкета: управление персоналом, тайминг, взаимодействие с кухней и декораторами.',
      requirements: 'Опыт банкетного менеджера от 5 лет, опыт работы на свадьбах от 50 персон, лидерские качества, стрессоустойчивость.',
      conditions: 'Фиксированная оплата (рассчитывается из ставки). Питание предоставляется.',
      dressCode: 'Деловой костюм (свой)',
      experienceRequired: 5,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: false,
      isUrgent: false,
      description: 'Требуется опытный банкетный менеджер на свадьбу 200 гостей. Полный контроль мероприятия от подготовки до финала.',
    },
    {
      employerId: ep3.id,
      title: 'Официанты на чайную церемонию (5 человек)',
      category: StaffCategory.waiter,
      rate: 500,
      rateType: RateType.hourly,
      eventType: EventType.private_party,
      employmentType: EmploymentType.single_shift,
      dateStart: future(6),
      timeStart: '14:00',
      timeEnd: '18:00',
      status: VacancyStatus.active,
      workersNeeded: 5,
      responsibilities: 'Подача чая, сладостей и закусок по протоколу церемонии. Работа с премиум-аудиторией.',
      requirements: 'Опыт работы с премиум-сегментом, деликатность, внимательность к деталям, медицинская книжка.',
      conditions: 'Почасовая оплата. Питание после церемонии.',
      dressCode: 'Классическая форма: белая рубашка, чёрные брюки (свои)',
      experienceRequired: 1,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Приглашаем 5 официантов на закрытую чайную церемонию. VIP-мероприятие, высокие стандарты сервиса.',
    },
    {
      employerId: ep3.id,
      title: 'Хостес-промо на открытии ресторана',
      category: StaffCategory.hostess,
      rate: 600,
      rateType: RateType.hourly,
      eventType: EventType.other,
      employmentType: EmploymentType.single_shift,
      dateStart: future(4),
      timeStart: '12:00',
      timeEnd: '17:00',
      status: VacancyStatus.active,
      workersNeeded: 3,
      responsibilities: 'Встреча гостей у входа, раздача меню, проводы к столикам, рассказ о концепции ресторана.',
      requirements: 'Презентабельная внешность, грамотная речь, умение произвести первое впечатление, позитивный настрой.',
      conditions: 'Почасовая оплата. Ужин в ресторане после смены.',
      dressCode: 'Форма ресторана (предоставляется)',
      experienceRequired: 0,
      foodProvided: true,
      transportProvided: false,
      tipsPossible: true,
      isUrgent: false,
      description: 'Ресторан «Якорь» открывает новый летний зал. Нужны 3 хостес-промо на день открытия.',
    },
  ];

  for (const v of newVacanciesData) {
    const existing = await prisma.vacancy.findFirst({
      where: { employerId: v.employerId, title: v.title },
    });
    if (!existing) {
      await prisma.vacancy.create({
        data: {
          employerId: v.employerId,
          cityId: novorossiysk.id,
          title: v.title,
          category: v.category,
          rate: v.rate,
          rateType: v.rateType,
          eventType: v.eventType,
          employmentType: v.employmentType,
          dateStart: v.dateStart,
          dateEnd: v.dateEnd,
          timeStart: v.timeStart,
          timeEnd: v.timeEnd,
          status: v.status,
          workersNeeded: v.workersNeeded,
          responsibilities: v.responsibilities,
          requirements: v.requirements,
          conditions: v.conditions,
          dressCode: v.dressCode,
          experienceRequired: v.experienceRequired,
          foodProvided: v.foodProvided,
          transportProvided: v.transportProvided,
          tipsPossible: v.tipsPossible,
          isUrgent: v.isUrgent,
          description: v.description,
          publishedAt: new Date(),
          viewsCount: Math.floor(Math.random() * 100) + 5,
        },
      });
    }
  }
  console.log('✅ 15 additional vacancies created');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ADMIN');
  console.log('  Email:    admin@unity-staff.ru');
  console.log('  Password: Admin1234!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  EMPLOYERS');
  console.log('  prichal@test.ru          / Test1234!  — Банкетный зал «Причал», Новороссийск');
  console.log('  catering.south@test.ru   / Test1234!  — Кейтеринг «Южный», Краснодар');
  console.log('  rest.anchor@test.ru      / Test1234!  — Ресторан «Якорь», Новороссийск');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  WORKERS');
  console.log('  anna.smirnova@test.ru    / Worker1234! — Анна Смирнова, бармен, рейтинг 4.9');
  console.log('  dmitry.kozlov@test.ru    / Worker1234! — Дмитрий Козлов, официант, рейтинг 4.7');
  console.log('  alexey.novikov@test.ru   / Worker1234! — Алексей Новиков, повар, рейтинг 4.95');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
