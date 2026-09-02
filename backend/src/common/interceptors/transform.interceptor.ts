import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    requestId: string;
    total?: number;
    page?: number;
    pageSize?: number;
    pages?: number;
    [key: string]: any;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.correlationId || (request.headers['x-correlation-id'] as string) || '';

    return next.handle().pipe(
      map((payload) => {
        // If response is already formatted as ApiResponse, return it with requestId
        if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
          return {
            ...payload,
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              ...(payload.meta || {}),
            },
          };
        }

        // If response is paginated ({ rows, total, page, pageSize, pages })
        if (payload && typeof payload === 'object' && Array.isArray(payload.rows) && typeof payload.total === 'number') {
          const { rows, total, page, pageSize, pages, ...restMeta } = payload;
          return {
            success: true,
            data: rows,
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              total,
              page,
              pageSize,
              pages,
              ...restMeta,
            },
          };
        }

        return {
          success: true,
          data: payload,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        };
      }),
    );
  }
}
