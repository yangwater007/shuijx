// 板块资金流向 Mock 数据
export const sectorFlowData = {
  date: '2026-07-31',
  timePoints: ['09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00'],
  inflowTop5: [
    { name: '芯片', value: 312.8, color: '#c0392b', data: [0, 120, 200, 260, 280, 290, 300, 320, 315, 312.8] },
    { name: '通信', value: 233.1, color: '#e74c3c', data: [0, 100, 160, 200, 220, 230, 235, 240, 235, 233.1] },
    { name: '人工智能', value: 182.5, color: '#e57373', data: [0, 50, 90, 130, 150, 160, 170, 180, 185, 182.5] },
    { name: 'AI应用', value: 151.5, color: '#ef9a9a', data: [0, 30, 70, 100, 120, 130, 140, 150, 152, 151.5] },
    { name: '算力', value: 124.6, color: '#ffcdd2', data: [0, 20, 50, 80, 100, 110, 115, 120, 125, 124.6] },
  ],
  outflowTop5: [
    { name: '银行', value: -5.5, color: '#27ae60', data: [0, -2, -3, -4, -5, -5.2, -5.4, -5.6, -5.5, -5.5] },
    { name: '证券', value: -5.4, color: '#2ecc71', data: [0, -1.5, -3, -4, -4.5, -5, -5.2, -5.5, -5.4, -5.4] },
    { name: '食品饮料', value: -3.9, color: '#66bb6a', data: [0, -1, -2, -2.5, -3, -3.5, -3.7, -4, -3.9, -3.9] },
    { name: '家电', value: -3.8, color: '#81c784', data: [0, -0.8, -1.8, -2.5, -3, -3.3, -3.5, -3.8, -3.9, -3.8] },
    { name: '酿酒', value: -3.4, color: '#a5d6a7', data: [0, -0.5, -1.5, -2, -2.5, -2.8, -3, -3.3, -3.4, -3.4] },
  ],
  indexTrend: {
    name: '上证指数',
    data: [0.6, 0.8, 0.9, 0.7, 0.6, 0.5, 0.6, 0.7, 0.8, 0.7],
  },
  totalSectors: 269,
  updateTime: '15:00',
};

export const sectorCategories = ['精选', '概念', '行业'];

export const dataDimensions = ['主力净额', '相对流入', '涨跌幅'];
export const timeDimensions = ['当日走势', '多日累计'];
export const displayModes = ['时间轴', '动态铺满', '全日固定'];
export const indexOptions = ['上证', '深证', '创业板', '科创板'];
export const yAxisModes = ['智能尺度', '真实比例'];
export const yAxisBases = ['累计净额', '相对基准'];
export const rankingTabs = ['资金两端', '基准转强', '曲线板块'];