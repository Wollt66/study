import { HttpClient, ApiResponse } from '@task-tracker/shared';
import { CompletionEvent } from '../types';

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

  async getCompletionsByTimeRange(userId: string, startDate: string, endDate: string): Promise<CompletionEvent[]> {
    const res = await this.http.request<ApiResponse<CompletionEvent[]>>(
      `${this.baseUrl}/tracking/internal/completions?userId=${encodeURIComponent(userId)}&startDate=${startDate}&endDate=${endDate}`,
    );
    return res.data ?? [];
  }
}
