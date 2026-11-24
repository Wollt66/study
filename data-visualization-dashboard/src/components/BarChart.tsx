import ChartCard from './ChartCard';
import { generateCategorySales } from '../mock/data';
import { useLiveData } from '../hooks/useLiveData';

interface Props {
  selectedCategory: string | null;
  onSelect: (category: string) => void;
}

export default function BarChart({ selectedCategory, onSelect }: Props) {
  const data = useLiveData(generateCategorySales, 5000);

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLabel: { color: '#8ab4f8' },
      axisLine: { lineStyle: { color: '#1a3a6a' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(26,58,106,0.5)' } },
      axisLabel: { color: '#8ab4f8' },
    },
    series: [{
      type: 'bar',
      data: data.map((d) => ({
        value: d.value,
        itemStyle: {
          color: selectedCategory === d.name ? '#00e4ff' : '#1a6aaa',
        },
      })),
      barWidth: '40%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  };

  return (
    <ChartCard
      title="分类销售对比（点击联动）"
      option={option}
      onEvents={{
        click: (params: any) => onSelect(params.name),
      }}
    />
  );
}
