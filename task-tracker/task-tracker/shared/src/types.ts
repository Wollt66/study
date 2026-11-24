// ===== 统一响应结构 =====
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

// ===== 游标分页 =====
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PageQuery {
  cursor?: string;
  limit?: number;
}

// ===== 枚举 =====
export enum Priority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

export enum TaskStatus {
  Todo = 'TODO',
  InProgress = 'IN_PROGRESS',
  Done = 'DONE',
}

export enum Period {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
}

// ===== JWT =====
export interface JwtPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}
