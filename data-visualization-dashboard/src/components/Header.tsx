import { useNow } from '../hooks/useLiveData';

export default function Header() {
  const now = useNow();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
  });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });

  return (
    <div className="header">
      <div style={{ width: 200 }} />
      <h1>电商数据可视化大屏</h1>
      <div className="time" style={{ width: 200, textAlign: 'right' }}>
        {dateStr} {timeStr}
      </div>
    </div>
  );
}
