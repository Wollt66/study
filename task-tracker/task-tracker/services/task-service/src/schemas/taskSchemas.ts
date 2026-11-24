import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题长度≤100'),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

export const listTaskQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
});
