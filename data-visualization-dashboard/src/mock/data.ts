// Mock 数据生成器：模拟实时数据
export interface SalesData {
  time: string;
  category: string;
  value: number;
}

const CATEGORIES = ['电子产品', '服装', '食品', '家居', '图书'];

export function generateHourlyTrend(): { time: string; values: Record<string, number> }[] {
  const result = [];
  for (let i = 0; i < 24; i++) {
    const hour = `${String(i).padStart(2, '0')}:00`;
    const values: Record<string, number> = {};
    CATEGORIES.forEach((cat) => {
      const base = 50 + Math.sin(i / 3 + CATEGORIES.indexOf(cat)) * 30;
      values[cat] = Math.round(base + Math.random() * 20);
    });
    result.push({ time: hour, values });
  }
  return result;
}

export function generateCategorySales(): { name: string; value: number }[] {
  return CATEGORIES.map((cat) => ({
    name: cat,
    value: Math.round(200 + Math.random() * 800),
  }));
}

export function generateProvinceData(): { name: string; value: number }[] {
  const provinces = ['广东', '江苏', '浙江', '山东', '北京', '上海', '四川', '湖北', '福建', '河南'];
  return provinces.map((name) => ({
    name,
    value: Math.round(100 + Math.random() * 900),
  })).sort((a, b) => b.value - a.value);
}

export function generateOverview() {
  return {
    totalSales: Math.round(120000 + Math.random() * 50000),
    orderCount: Math.round(8000 + Math.random() * 3000),
    userCount: Math.round(45000 + Math.random() * 10000),
    conversionRate: (3 + Math.random() * 2).toFixed(2),
  };
}

export { CATEGORIES };
