import type { Media, MediaType, Prisma, PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import type { StorageAdapter } from '@/storage/storage-adapter';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const MIME_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_VIDEO = new Set(['video/mp4', 'video/webm']);
const MIME_PDF = new Set(['application/pdf']);

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
};

const SINGLE_SLOT: MediaType[] = [
  'AVATAR',
  'VIDEO_CARD',
  'COMPANY_LOGO',
  'COMPANY_BANNER',
];

/** Types that skip moderation — owner and public see them immediately. */
const AUTO_APPROVED_TYPES = new Set<MediaType>([
  'AVATAR',
  'PORTFOLIO_PHOTO',
  'COMPANY_LOGO',
  'COMPANY_BANNER',
  'COMPANY_GALLERY',
]);

function allowedMimes(type: MediaType): Set<string> {
  switch (type) {
    case 'AVATAR':
    case 'PORTFOLIO_PHOTO':
    case 'COMPANY_LOGO':
    case 'COMPANY_BANNER':
    case 'COMPANY_GALLERY':
      return MIME_IMAGE;
    case 'VIDEO_CARD':
      return MIME_VIDEO;
    case 'DOCUMENT':
      return MIME_PDF;
    default:
      return new Set();
  }
}

function folderForType(userId: string, type: MediaType): string {
  const isCompany =
    type === 'COMPANY_LOGO' || type === 'COMPANY_BANNER' || type === 'COMPANY_GALLERY';
  const base = isCompany ? pathJoin('employers', userId) : userId;
  switch (type) {
    case 'AVATAR':
      return pathJoin(base, 'avatar');
    case 'PORTFOLIO_PHOTO':
      return pathJoin(base, 'portfolio');
    case 'VIDEO_CARD':
      return pathJoin(base, 'video');
    case 'DOCUMENT':
      return pathJoin(base, 'documents');
    case 'COMPANY_LOGO':
      return pathJoin(base, 'logo');
    case 'COMPANY_BANNER':
      return pathJoin(base, 'banner');
    case 'COMPANY_GALLERY':
      return pathJoin(base, 'gallery');
    default:
      return base;
  }
}

function pathJoin(...parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

export function assertRoleForMediaType(activeRole: string, type: MediaType): void {
  const workerTypes: MediaType[] = ['AVATAR', 'PORTFOLIO_PHOTO', 'VIDEO_CARD', 'DOCUMENT'];
  const employerTypes: MediaType[] = ['COMPANY_LOGO', 'COMPANY_BANNER', 'COMPANY_GALLERY'];
  if (activeRole === 'employer' && !employerTypes.includes(type)) {
    throw Object.assign(new Error('Тип файла недоступен для работодателя'), { statusCode: 403 });
  }
  if (activeRole === 'worker' && !workerTypes.includes(type)) {
    throw Object.assign(new Error('Тип файла недоступен для работника'), { statusCode: 403 });
  }
  if (activeRole !== 'worker' && activeRole !== 'employer') {
    throw Object.assign(new Error('Загрузка недоступна для этой роли'), { statusCode: 403 });
  }
}

/** DB client usable inside/outside `$transaction`. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export class MediaService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageAdapter,
  ) {}

  async upload(params: {
    userId: string;
    activeRole: string;
    buffer: Buffer;
    mimeType: string;
    type: MediaType;
  }): Promise<Media> {
    const { userId, activeRole, buffer, mimeType, type } = params;

    if (buffer.length > MAX_FILE_BYTES) {
      throw Object.assign(new Error('Файл больше 5 МБ'), { statusCode: 400 });
    }

    assertRoleForMediaType(activeRole, type);

    const allowed = allowedMimes(type);
    if (!allowed.has(mimeType)) {
      throw Object.assign(new Error('Недопустимый тип файла'), { statusCode: 400 });
    }

    await this.enforceCountLimits(userId, activeRole, type);

    const singleSlotPrevious = SINGLE_SLOT.includes(type)
      ? await this.prisma.media.findMany({ where: { userId, type } })
      : [];

    const ext = EXT[mimeType] ?? '.bin';
    const fileBase = `${nanoid()}${ext}`;
    const dir = folderForType(userId, type);
    const storagePath = pathJoin(dir, fileBase);
    const url = await this.storage.upload(buffer, storagePath);

    // Auto-approve photos/avatars — only documents and videos require moderation
    const autoApprove = AUTO_APPROVED_TYPES.has(type);

    const media = await this.prisma.$transaction(async (tx) => {
      const m = await tx.media.create({
        data: {
          userId,
          type,
          url,
          storagePath,
          filename: fileBase,
          mimeType,
          size: buffer.length,
          isApproved: autoApprove,
          isRejected: false,
          ...(autoApprove ? { moderatedAt: new Date() } : {}),
        },
      });
      if (autoApprove) {
        await this.applyApprovedProfileSync(tx, m);
      }
      return m;
    });

    for (const old of singleSlotPrevious) {
      try {
        await this.storage.delete(old.storagePath);
      } catch {
        /* ignore ENOENT etc. */
      }
      await this.prisma.media.delete({ where: { id: old.id } }).catch(() => {});
      // Profile already points to the new asset — do NOT revertApprovedSync(old).
    }

    return media;
  }

  private async enforceCountLimits(userId: string, role: string, type: MediaType): Promise<void> {
    if (SINGLE_SLOT.includes(type)) return;

    const countActive = async (t: MediaType) =>
      this.prisma.media.count({
        where: { userId, type: t, isRejected: false },
      });

    if (role === 'worker') {
      if (type === 'PORTFOLIO_PHOTO' && (await countActive('PORTFOLIO_PHOTO')) >= 10) {
        throw Object.assign(new Error('Лимит фото портфолио: 10'), { statusCode: 400 });
      }
      if (type === 'DOCUMENT' && (await countActive('DOCUMENT')) >= 5) {
        throw Object.assign(new Error('Лимит документов: 5'), { statusCode: 400 });
      }
    }
    if (role === 'employer' && type === 'COMPANY_GALLERY' && (await countActive('COMPANY_GALLERY')) >= 10) {
      throw Object.assign(new Error('Лимит фото галереи: 10'), { statusCode: 400 });
    }
  }

  private async revertApprovedSync(m: Media): Promise<void> {
    if (!m.isApproved) return;
    switch (m.type) {
      case 'AVATAR':
        await this.prisma.workerProfile.updateMany({
          where: { userId: m.userId, photoUrl: m.url },
          data: { photoUrl: null },
        });
        break;
      case 'VIDEO_CARD':
        await this.prisma.workerProfile.updateMany({
          where: { userId: m.userId, videoUrl: m.url },
          data: { videoUrl: null },
        });
        break;
      case 'PORTFOLIO_PHOTO': {
        const wp = await this.prisma.workerProfile.findUnique({ where: { userId: m.userId } });
        if (wp) {
          await this.prisma.workerPortfolioPhoto.deleteMany({
            where: { workerId: wp.id, url: m.url },
          });
        }
        break;
      }
      case 'DOCUMENT': {
        const wp = await this.prisma.workerProfile.findUnique({ where: { userId: m.userId } });
        if (wp) {
          await this.prisma.workerDocument.deleteMany({
            where: { workerId: wp.id, url: m.url },
          });
        }
        break;
      }
      case 'COMPANY_LOGO':
        await this.prisma.employerProfile.updateMany({
          where: { userId: m.userId, logoUrl: m.url },
          data: { logoUrl: null },
        });
        break;
      case 'COMPANY_BANNER':
        await this.prisma.employerProfile.updateMany({
          where: { userId: m.userId, bannerUrl: m.url },
          data: { bannerUrl: null },
        });
        break;
      default:
        break;
    }
  }

  async delete(mediaId: string, userId: string): Promise<void> {
    const m = await this.prisma.media.findFirst({ where: { id: mediaId, userId } });
    if (!m) {
      throw Object.assign(new Error('Файл не найден'), { statusCode: 404 });
    }
    await this.storage.delete(m.storagePath);
    await this.revertApprovedSync(m);
    await this.prisma.media.delete({ where: { id: m.id } });
  }

  async getForUser(userId: string): Promise<Media[]> {
    return this.prisma.media.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(mediaId: string, adminId: string): Promise<Media> {
    const m = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!m) {
      throw Object.assign(new Error('Не найдено'), { statusCode: 404 });
    }
    if (m.isApproved || m.isRejected) {
      throw Object.assign(new Error('Файл уже обработан'), { statusCode: 400 });
    }

    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        isApproved: true,
        isRejected: false,
        moderatedBy: adminId,
        moderatedAt: new Date(),
        moderationNote: null,
      },
    });

    await this.applyApprovedProfileSync(this.prisma, updated);
    return updated;
  }

  async reject(mediaId: string, adminId: string, reason?: string): Promise<void> {
    const m = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!m) {
      throw Object.assign(new Error('Не найдено'), { statusCode: 404 });
    }
    if (m.isApproved || m.isRejected) {
      throw Object.assign(new Error('Файл уже обработан'), { statusCode: 400 });
    }

    await this.storage.delete(m.storagePath);
    await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        isApproved: false,
        isRejected: true,
        moderationNote: reason?.slice(0, 4000) ?? null,
        url: '',
        storagePath: '',
        moderatedBy: adminId,
        moderatedAt: new Date(),
      },
    });
  }

  private async applyApprovedProfileSync(db: DbClient, m: Media): Promise<void> {
    switch (m.type) {
      case 'AVATAR':
        await db.workerProfile.update({
          where: { userId: m.userId },
          data: { photoUrl: m.url },
        });
        break;
      case 'VIDEO_CARD':
        await db.workerProfile.update({
          where: { userId: m.userId },
          data: { videoUrl: m.url },
        });
        break;
      case 'PORTFOLIO_PHOTO': {
        const wp = await db.workerProfile.findUnique({ where: { userId: m.userId } });
        if (wp) {
          await db.workerPortfolioPhoto.create({
            data: { workerId: wp.id, url: m.url },
          });
        }
        break;
      }
      case 'DOCUMENT': {
        const wp = await db.workerProfile.findUnique({ where: { userId: m.userId } });
        if (wp) {
          await db.workerDocument.create({
            data: {
              workerId: wp.id,
              type: 'other',
              url: m.url,
              fileName: m.filename,
              status: 'verified',
            },
          });
        }
        break;
      }
      case 'COMPANY_LOGO':
        await db.employerProfile.update({
          where: { userId: m.userId },
          data: { logoUrl: m.url },
        });
        break;
      case 'COMPANY_BANNER':
        await db.employerProfile.update({
          where: { userId: m.userId },
          data: { bannerUrl: m.url },
        });
        break;
      default:
        break;
    }
  }

  listPending() {
    // Only DOCUMENT and VIDEO_CARD require manual moderation
    const MODERATED_TYPES: MediaType[] = ['DOCUMENT', 'VIDEO_CARD'];
    return this.prisma.media.findMany({
      where: { isApproved: false, isRejected: false, type: { in: MODERATED_TYPES } },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            activeRole: true,
            workerProfile: { select: { id: true, firstName: true, lastName: true } },
            employerProfile: { select: { id: true, companyName: true, contactName: true } },
            roles: { select: { role: true } },
          },
        },
      },
    });
  }
}
