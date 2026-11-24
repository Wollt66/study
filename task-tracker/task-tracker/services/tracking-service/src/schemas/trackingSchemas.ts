import { z } from 'zod';

export const recordCompletionSchema = z.object({
  taskId: z.string().min(1),
  userId: z.string().min(1),
  completedAt: z.string().datetime().optional(),
});

export const recordStatusLogSchema = z.object({
  taskId: z.string().min(1),
  userId: z.string().min(1),
  fromStatus: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  toStatus: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  changedAt: z.string().datetime().optional(),
});

export const listQuerySchema = z.object({
  taskId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
