import { AppError, ErrorCode } from './errorCodes';
import { PaginatedResponse } from './types';

export interface DecodedCursor {
  sortField: string;
  sortValue: string | number;
}

/**
 * 编码游标：base64(JSON({sortField, sortValue}))
 */
export function encodeCursor(sortField: string, sortValue: string | number): string {
  const raw = JSON.stringify({ sortField, sortValue });
  return Buffer.from(raw, 'utf-8').toString('base64url');
}

/**
 * 解码游标，非法格式抛 1001 参数错误
 */
export function decodeCursor(cursor: string): DecodedCursor {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf-8');
    const obj = JSON.parse(raw);
    if (typeof obj.sortField !== 'string' || obj.sortValue === undefined) {
      throw new Error('invalid cursor shape');
    }
    return { sortField: obj.sortField, sortValue: obj.sortValue };
  } catch {
    throw new AppError(ErrorCode.BAD_REQUEST, '无效的分页游标');
  }
}

/**
 * 根据当前页 items 与 limit 计算 nextCursor / hasMore
 * items 必须按 sortField 倒序取出 limit+1 条来判断是否还有下一页
 */
export function buildPaginatedResponse<T extends Record<string, unknown>>(
  items: T[],
  limit: number,
  cursorField: string,
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  let nextCursor: string | null = null;
  if (hasMore && pageItems.length > 0) {
    const lastItem = pageItems[pageItems.length - 1];
    nextCursor = encodeCursor(cursorField, String(lastItem[cursorField]));
  }
  return { items: pageItems, nextCursor, hasMore };
}
