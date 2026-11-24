export interface CompletionEvent {
  event_id: string;
  task_id: string;
  user_id: string;
  completed_at: string;
}

export interface SummaryResult {
  totalCompleted: number;
  totalTasks: number;
  completionRate: number;
}

export interface CategoryStat {
  category: string;
  completedCount: number;
  completionRate: number;
}

export interface DailyReport {
  date: string;
  completedCount: number;
}

export interface TrendPoint {
  period: string;
  completionRate: number;
}
