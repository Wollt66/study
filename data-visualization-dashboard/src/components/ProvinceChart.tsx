import ChartCard from './ChartCard';
import { generateProvinceData } from '../mock/data';
import { useLiveData } from '../hooks/useLiveData';

export default function ProvinceChart() {
  const data = useLiveData(generateProvinceData, 5000);

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 70, right: 30, top: 10, bottom: 20 },
    xAxis: { type: 'value', axisLabel: { color: '#8ab4f8' }, splitLine: { lineStyle: { color: 'rgba(26,58,106,0.5)' } } },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.name).reverse(),
      axisLabel: { color: '#8ab4f8' },
      axisLine: { lineStyle: { color: '#1a3a6a' } },
    },
    series: [{
      type: 'bar',
      data: data.map((d) => d.value).reverse(),
      barWidth: '50%',
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#1a3a6a' },
            { offset: 1, color: '#00b4ff' },
          ],
        },
      },
    }],
  };

  return <ChartCard title="全国省份销售分布 TOP10" option={option} />;
}
