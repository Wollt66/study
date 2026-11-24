export interface CompletionRow {
  event_id: string;
  task_id: string;
  user_id: string;
  completed_at: string;
}

export interface StatusLogRow {
  log_id: string;
  task_id: string;
  user_id: string;
  from_status: string;
  to_status: string;
  changed_at: string;
}

export interface ProgressResult {
  completed: number;
  inProgress: number;
  todo: number;
  completionRate: number;
}
