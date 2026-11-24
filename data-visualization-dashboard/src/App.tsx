import { useEffect, useState } from 'react';
import Header from './components/Header';
import NumberPanel from './components/NumberPanel';
import LineChart from './components/LineChart';
import BarChart from './components/BarChart';
import PieChart from './components/PieChart';
import ProvinceChart from './components/ProvinceChart';
import RankList from './components/RankList';

/** 大屏等比缩放：1920x1080 适配任意屏幕 */
function useScreenScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      setScale(s);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

export default function App() {
  const scale = useScreenScale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 点击已选中的分类则取消联动
  const handleSelect = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  return (
    <div className="screen-wrapper">
      <div className="screen" style={{ transform: `scale(${scale})` }}>
        <Header />
        <div className="body">
          {/* 左栏 */}
          <div className="col">
            <NumberPanel />
            <PieChart selectedCategory={selectedCategory} />
            <RankList />
          </div>
          {/* 中栏 */}
          <div className="col" style={{ gridTemplateRows: '1fr 1fr' }}>
            <LineChart selectedCategory={selectedCategory} />
            <BarChart selectedCategory={selectedCategory} onSelect={handleSelect} />
          </div>
          {/* 右栏 */}
          <div className="col" style={{ gridTemplateRows: '1fr' }}>
            <ProvinceChart />
          </div>
        </div>
      </div>
    </div>
  );
}
