import { useEffect, useState } from 'react';

/**
 * 实时数据 Hook：每 3 秒刷新一次，模拟 WebSocket 推送
 */
export function useLiveData<T>(generator: () => T, intervalMs: number = 3000): T {
  const [data, setData] = useState<T>(() => generator());

  useEffect(() => {
    const timer = setInterval(() => {
      setData(generator());
    }, intervalMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return data;
}

/**
 * 当前时间 Hook：每秒更新
 */
export function useNow(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
