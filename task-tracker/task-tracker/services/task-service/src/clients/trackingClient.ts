import { HttpClient } from '@task-tracker/shared';

export interface CompletionPayload {
  taskId: string;
  userId: string;
  completedAt?: string;
}

export interface StatusLogPayload {
  taskId: string;
  userId: string;
  fromStatus: string;
  toStatus: string;
  changedAt?: string;
}

export class TrackingClient {
  private http: HttpClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.TRACKING_SERVICE_URL || 'http://localhost:3003/api';
    this.http = new HttpClient({
      timeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '3000', 10),
      internalToken: process.env.INTERNAL_TOKEN,
    });
  }

  async recordCompletion(payload: CompletionPayload): Promise<{ eventId: string }> {
    return this.http.request<{ eventId: string }>(`${this.baseUrl}/tracking/completions`, {
      method: 'POST',
      body: payload,
    });
  }

  async recordStatusLog(payload: StatusLogPayload): Promise<{ logId: string }> {
    return this.http.request<{ logId: string }>(`${this.baseUrl}/tracking/status-logs`, {
      method: 'POST',
      body: payload,
    });
  }
}
