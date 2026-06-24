/* Создаёт (или обновляет) тестового работодателя — частное лицо.
   Запускается на проде внутри /opt/unity/packages/api, где есть
   сгенерированный @prisma/client и bcrypt. Пароль задаётся через env. */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('SEED_EMAIL / SEED_PASSWORD не заданы');
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const existing = await prisma.user.findFirst({
    where: { email: EMAIL },
    select: { id: true, roles: true, employerProfile: { select: { id: true } } },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, emailVerified: true, activeRole: 'employer' },
    });
    const hasEmployerRole = existing.roles.some((r) => r.role === 'employer');
    if (!hasEmployerRole) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { roles: { create: { role: 'employer' } } },
      });
    }
    if (existing.employerProfile) {
      await prisma.employerProfile.update({
        where: { id: existing.employerProfile.id },
        data: { type: 'individual', businessType: 'individual' },
      });
    } else {
      await prisma.employerProfile.create({
        data: {
          userId: existing.id,
          slug: 'employer-' + crypto.randomBytes(5).toString('hex'),
          type: 'individual',
          businessType: 'individual',
          contactName: 'Тестовый Заказчик',
        },
      });
    }
    console.log('UPDATED ' + existing.id);
    return;
  }

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: EMAIL,
        passwordHash,
        emailVerified: true,
        activeRole: 'employer',
        consentGivenAt: new Date(),
        roles: { create: { role: 'employer' } },
      },
    });
    await tx.employerProfile.create({
      data: {
        userId: u.id,
        slug: 'employer-' + crypto.randomBytes(5).toString('hex'),
        type: 'individual',
        businessType: 'individual',
        contactName: 'Тестовый Заказчик',
      },
    });
    await tx.notificationPreferences.create({ data: { userId: u.id } });
    return u;
  });
  console.log('CREATED ' + user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
