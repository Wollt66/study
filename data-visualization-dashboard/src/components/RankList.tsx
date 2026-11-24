import { generateProvinceData } from '../mock/data';
import { useLiveData } from '../hooks/useLiveData';

export default function RankList() {
  const data = useLiveData(generateProvinceData, 5000);
  const max = data[0]?.value || 1;

  return (
    <div className="panel">
      <div className="panel-title">省份销售排行</div>
      <div className="panel-body" style={{ overflow: 'hidden' }}>
        <ul className="rank-list">
          {data.slice(0, 8).map((item, idx) => (
            <li key={item.name}>
              <span className="idx">{idx + 1}</span>
              <span style={{ width: 50 }}>{item.name}</span>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
              <span style={{ width: 60, textAlign: 'right' }}>{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
