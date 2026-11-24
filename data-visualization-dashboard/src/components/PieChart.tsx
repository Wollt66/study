import ChartCard from './ChartCard';
import { generateCategorySales } from '../mock/data';
import { useLiveData } from '../hooks/useLiveData';

interface Props {
  selectedCategory: string | null;
}

export default function PieChart({ selectedCategory }: Props) {
  const allData = useLiveData(generateCategorySales, 5000);
  const data = selectedCategory
    ? allData.filter((d) => d.name === selectedCategory)
    : allData;

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#8ab4f8' } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      label: { color: '#8ab4f8' },
      data,
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
    color: ['#00b4ff', '#00e676', '#ffc107', '#ff5252', '#e040fb'],
  };

  return <ChartCard title="品类占比分布" option={option} />;
}
