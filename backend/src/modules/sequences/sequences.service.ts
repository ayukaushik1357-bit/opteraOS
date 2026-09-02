import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequenceType } from '@prisma/client';

@Injectable()
export class SequencesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Concurrency-safe atomic sequence number generator.
   * Uses Prisma transaction with upsert & row-level update.
   */
  async getNextSequence(
    orgId: string,
    sequenceType: SequenceType,
    customPrefix?: string,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();

    return this.prisma.$transaction(async (tx) => {
      let seq = await tx.salesSequence.findUnique({
        where: {
          organizationId_sequenceType: {
            organizationId: orgId,
            sequenceType,
          },
        },
      });

      if (!seq) {
        const defaultPrefix =
          customPrefix ||
          (sequenceType === SequenceType.QUOTATION
            ? 'QT'
            : sequenceType === SequenceType.SALES_ORDER
              ? 'SO'
              : sequenceType === SequenceType.INVOICE
                ? 'INV'
                : 'LD');

        seq = await tx.salesSequence.create({
          data: {
            organizationId: orgId,
            sequenceType,
            prefix: defaultPrefix,
            padding: 5,
            nextValue: 1,
            yearReset: true,
            currentYear,
          },
        });
      }

      let nextVal = seq.nextValue;
      if (seq.yearReset && seq.currentYear !== currentYear) {
        nextVal = 1;
        await tx.salesSequence.update({
          where: { id: seq.id },
          data: { currentYear, nextValue: 2 },
        });
      } else {
        await tx.salesSequence.update({
          where: { id: seq.id },
          data: { nextValue: nextVal + 1 },
        });
      }

      const formattedNumber = String(nextVal).padStart(seq.padding, '0');
      const yearPart = seq.yearReset ? `${currentYear}-` : '';
      const prefixPart = seq.prefix ? `${seq.prefix}-` : '';
      const suffixPart = seq.suffix ? `-${seq.suffix}` : '';

      return `${prefixPart}${yearPart}${formattedNumber}${suffixPart}`;
    });
  }
}
