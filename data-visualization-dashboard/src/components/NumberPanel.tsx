import { generateOverview } from '../mock/data';
import { useLiveData } from '../hooks/useLiveData';

export default function NumberPanel() {
  const data = useLiveData(generateOverview, 3000);

  const items = [
    { label: '总销售额（元）', value: data.totalSales.toLocaleString(), trend: '+12.5%', up: true },
    { label: '订单数', value: data.orderCount.toLocaleString(), trend: '+8.3%', up: true },
    { label: '活跃用户', value: data.userCount.toLocaleString(), trend: '-2.1%', up: false },
    { label: '转化率（%）', value: data.conversionRate, trend: '+0.8%', up: true },
  ];

  return (
    <div className="number-row">
      {items.map((item) => (
        <div className="number-card" key={item.label}>
          <div className="label">{item.label}</div>
          <div className="value">{item.value}</div>
          <div className={`trend ${item.up ? 'up' : 'down'}`}>
            {item.up ? '▲' : '▼'} {item.trend}
          </div>
        </div>
      ))}
    </div>
  );
}
