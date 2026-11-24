import { CompletionEvent, DailyReport } from '../types';

/** 按日聚合完成事件 */
export function aggregateDaily(completions: CompletionEvent[]): DailyReport[] {
  const map = new Map<string, number>();
  for (const c of completions) {
    const date = c.completed_at.slice(0, 10); // YYYY-MM-DD
    map.set(date, (map.get(date) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, completedCount: count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 按周聚合（ISO 周） */
export function aggregateWeekly(completions: CompletionEvent[]): Array<{ week: string; completedCount: number }> {
  const map = new Map<string, number>();
  for (const c of completions) {
    const d = new Date(c.completed_at);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([week, count]) => ({ week, completedCount: count }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/** 按月聚合 */
export function aggregateMonthly(completions: CompletionEvent[]): Array<{ month: string; completedCount: number }> {
  const map = new Map<string, number>();
  for (const c of completions) {
    const month = c.completed_at.slice(0, 7); // YYYY-MM
    map.set(month, (map.get(month) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([month, count]) => ({ month, completedCount: count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** 计算完成率 */
export function calcRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 10000) / 10000;
}
