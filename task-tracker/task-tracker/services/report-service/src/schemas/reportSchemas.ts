import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');

export const reportQuerySchema = z.object({
  startDate: dateStr,
  endDate: dateStr,
}).refine((d) => d.startDate <= d.endDate, { message: '开始日期不能晚于结束日期', path: ['startDate'] })
  .refine((d) => {
    const diff = new Date(d.endDate).getTime() - new Date(d.startDate).getTime();
    return diff <= 366 * 86400000;
  }, { message: '时间跨度不能超过 366 天', path: ['endDate'] });

export const trendQuerySchema = reportQuerySchema.extend({
  period: z.enum(['daily', 'weekly', 'monthly']),
});
