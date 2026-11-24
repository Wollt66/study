import ReactECharts from 'echarts-for-react';

interface Props {
  title: string;
  option: Record<string, unknown>;
  onEvents?: Record<string, (params: unknown) => void>;
}

const BaseOption = {
  backgroundColor: 'transparent',
  textStyle: { color: '#8ab4f8' },
  tooltip: {
    backgroundColor: 'rgba(0, 40, 100, 0.9)',
    borderColor: '#00b4ff',
    textStyle: { color: '#fff' },
  },
};

export default function ChartCard({ title, option, onEvents }: Props) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <div className="panel-body">
        <ReactECharts
          option={{ ...BaseOption, ...option }}
          style={{ height: '100%', width: '100%' }}
          notMerge
          onEvents={onEvents}
        />
      </div>
    </div>
  );
}
