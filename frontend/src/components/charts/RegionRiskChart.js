import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useChartTokens } from './useChartTokens';

const RegionRiskChart = ({ data = [] }) => {
  const tokens = useChartTokens();

  const option = {
    animationDuration: 280,
    grid: { left: 18, right: 18, top: 20, bottom: 24, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tokens.surface,
      borderColor: tokens.grid,
      textStyle: { color: tokens.text, fontSize: 12 },
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: tokens.grid } },
      splitLine: { lineStyle: { color: tokens.grid } },
      axisLabel: { color: tokens.muted, formatter: (value) => `${Math.round(value * 100)}%` },
      max: 1,
    },
    yAxis: {
      type: 'category',
      data: data.map((entry) => entry.region),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: tokens.muted },
    },
    series: [
      {
        type: 'bar',
        data: data.map((entry) => entry.risk),
        barWidth: 12,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: (params) => (params.dataIndex % 2 === 0 ? tokens.accent : tokens.gold),
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />;
};

export default RegionRiskChart;
