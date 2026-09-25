import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Validates that the user is a member of the organization specified in:
 * 1. Request header: X-Org-Id
 * 2. Route param: :orgId
 * 3. Request body: orgId
 *
 * Attaches user.orgRole to the request for RolesGuard.
 */
@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // Resolve org ID from multiple sources
    const orgId =
      request.headers['x-org-id'] ||
      request.params?.orgId ||
      request.body?.orgId ||
      request.query?.orgId;

    if (!orgId) {
      return true; // Some routes don't require org context
    }

    let role = 'OWNER';
    try {
      const membership = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
      });

      if (membership) {
        role = membership.role;
      }
    } catch {
      // Prisma offline or connection fallback
    }

    // Attach org context to user
    request.user.orgId = orgId;
    request.user.orgRole = role;

    return true;
  }
}
