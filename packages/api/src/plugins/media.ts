import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { LocalStorageAdapter } from '@/storage/local-storage-adapter';
import { MediaService } from '@/services/media-service';

declare module 'fastify' {
  interface FastifyInstance {
    mediaService: MediaService;
  }
}

const mediaPlugin: FastifyPluginAsync = async (fastify) => {
  const storage = new LocalStorageAdapter();
  const mediaService = new MediaService(fastify.prisma, storage);
  fastify.decorate('mediaService', mediaService);
};

export default fp(mediaPlugin, { name: 'media', dependencies: ['prisma'] });
