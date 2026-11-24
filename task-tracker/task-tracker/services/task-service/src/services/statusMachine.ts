import { TaskStatus } from '@task-tracker/shared';

// 合法流转表
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.Todo]: [TaskStatus.InProgress, TaskStatus.Done],
  [TaskStatus.InProgress]: [TaskStatus.Done],
  [TaskStatus.Done]: [TaskStatus.InProgress], // 允许重新打开
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
