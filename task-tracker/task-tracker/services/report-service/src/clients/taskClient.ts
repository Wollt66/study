import { HttpClient, ApiResponse } from '@task-tracker/shared';

export interface TaskCountByStatus {
  todo: number;
  inProgress: number;
  done: number;
}

export class TaskClient {
  private http: HttpClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.TASK_SERVICE_URL || 'http://localhost:3002/api';
    this.http = new HttpClient({
      timeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '3000', 10),
      internalToken: process.env.INTERNAL_TOKEN,
    });
  }

  async getTaskCountByStatus(userId: string): Promise<TaskCountByStatus> {
    const res = await this.http.request<ApiResponse<TaskCountByStatus>>(
      `${this.baseUrl}/tasks/internal/count-by-status?userId=${encodeURIComponent(userId)}`,
    );
    return res.data;
  }
}
