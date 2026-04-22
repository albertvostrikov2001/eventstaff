import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { Queue } from 'bullmq';
import { bullmqConnectionFromEnv } from '@/lib/bullmq-redis';
import { EmailService } from '@/services/email-service';
import { NotificationService } from '@/services/notification-service';

declare module 'fastify' {
  interface FastifyInstance {
    notificationService: NotificationService;
    emailService: EmailService;
    emailQueue: Queue;
  }
}

const notificationsPlugin: FastifyPluginAsync = async (fastify) => {
  const connection = bullmqConnectionFromEnv();
  const emailQueue = new Queue('email', {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    },
  });

  const notificationService = new NotificationService(fastify.prisma);
  const emailService = new EmailService(fastify.prisma, fastify.redis, emailQueue, fastify.log);

  fastify.decorate('emailQueue', emailQueue);
  fastify.decorate('notificationService', notificationService);
  fastify.decorate('emailService', emailService);

  fastify.addHook('onClose', async () => {
    await emailQueue.close();
  });
};

export default fp(notificationsPlugin, {
  name: 'notifications',
  dependencies: ['prisma', 'redis'],
});
