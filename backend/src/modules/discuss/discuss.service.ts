import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignatureStatus } from '@prisma/client';

@Injectable()
export class DiscussService {
  constructor(private prisma: PrismaService) {}

  // ─── Discussion Channels ──────────────────────────────────────────────────
  async getChannels(orgId: string) {
    return this.prisma.discussionChannel.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { messages: true, members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getChannelMessages(orgId: string, channelId: string) {
    return this.prisma.channelMessage.findMany({
      where: { channelId, channel: { organizationId: orgId } },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async createChannel(orgId: string, dto: { name: string; type?: string; description?: string }) {
    return this.prisma.discussionChannel.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        type: dto.type || 'public',
        description: dto.description,
      },
    });
  }

  async postMessage(orgId: string, userId: string, channelId: string, dto: { content: string; attachments?: any }) {
    return this.prisma.channelMessage.create({
      data: {
        channelId,
        userId,
        content: dto.content,
        attachments: dto.attachments,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  // ─── Documents ────────────────────────────────────────────────────────────
  async getDocuments(orgId: string, category?: string) {
    const where: any = { organizationId: orgId };
    if (category) where.category = category;
    return this.prisma.documentRecord.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createDocument(orgId: string, dto: any) {
    return this.prisma.documentRecord.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  // ─── Digital Signatures ───────────────────────────────────────────────────
  async getSignatureRequests(orgId: string) {
    return this.prisma.signatureRequest.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSignatureRequest(orgId: string, dto: {
    title: string;
    documentUrl: string;
    signerName: string;
    signerEmail: string;
  }) {
    return this.prisma.signatureRequest.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        documentUrl: dto.documentUrl,
        signerName: dto.signerName,
        signerEmail: dto.signerEmail,
        status: SignatureStatus.PENDING,
      },
    });
  }

  async signDocument(orgId: string, id: string, auditHash?: string) {
    return this.prisma.signatureRequest.update({
      where: { id },
      data: {
        status: SignatureStatus.SIGNED,
        signedAt: new Date(),
        auditHash: auditHash || `SIGN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });
  }
}
