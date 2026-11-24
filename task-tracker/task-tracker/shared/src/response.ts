import { ApiResponse } from './types';

export function ok<T>(data: T, message: string = 'ok'): ApiResponse<T> {
  return { code: 0, message, data };
}

export function fail(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}
