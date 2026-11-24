import ChartCard from './ChartCard';
import { generateHourlyTrend, CATEGORIES } from '../mock/data';
import { useLiveData } from '../hooks/useLiveData';

interface Props {
  selectedCategory: string | null;
}

const COLORS = ['#00b4ff', '#00e676', '#ffc107', '#ff5252', '#e040fb'];

export default function LineChart({ selectedCategory }: Props) {
  const data = useLiveData(generateHourlyTrend, 5000);

  const series = CATEGORIES
    .filter((cat) => !selectedCategory || cat === selectedCategory)
    .map((cat, idx) => ({
      name: cat,
      type: 'line' as const,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2 },
      data: data.map((d) => d.values[cat]),
    }));

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: CATEGORIES.filter((c) => !selectedCategory || c === selectedCategory), textStyle: { color: '#8ab4f8' }, top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.time),
      axisLine: { lineStyle: { color: '#1a3a6a' } },
      axisLabel: { color: '#8ab4f8' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(26,58,106,0.5)' } },
      axisLabel: { color: '#8ab4f8' },
    },
    color: COLORS,
    series,
  };

  return <ChartCard title="24小时销售趋势" option={option} />;
}
