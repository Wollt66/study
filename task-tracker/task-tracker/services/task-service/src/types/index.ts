import { Priority, TaskStatus } from '@task-tracker/shared';

export interface TaskRow {
  task_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  category?: string;
  priority?: Priority;
  dueDate?: string;
}

export interface UpdateTaskBody {
  title?: string;
  description?: string;
  category?: string;
  priority?: Priority;
  dueDate?: string;
}

export interface TaskFilters {
  category?: string;
  priority?: Priority;
  status?: TaskStatus;
}

export interface OutboxRow {
  id: number;
  event_type: string;
  payload: string;
  target_url: string;
  status: string;
  retries: number;
  created_at: string;
  next_retry_at: string | null;
}

export interface Task {
  taskId: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
