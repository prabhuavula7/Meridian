import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useChartTokens } from './useChartTokens';

const RiskTrendChart = ({ data = [] }) => {
  const tokens = useChartTokens();

  const option = {
    animationDuration: 280,
    grid: { left: 34, right: 16, top: 26, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tokens.surface,
      borderColor: tokens.grid,
      textStyle: { color: tokens.text, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: data.map((point) => point.month),
      axisLine: { lineStyle: { color: tokens.grid } },
      axisLabel: { color: tokens.muted, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 60,
      max: 95,
      splitLine: { lineStyle: { color: tokens.grid } },
      axisLabel: { color: tokens.muted, fontSize: 11 },
    },
    series: [
      {
        name: 'Baseline OTIF',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: tokens.gold },
        areaStyle: { color: `${tokens.gold}22` },
        data: data.map((point) => point.baseline),
      },
      {
        name: 'Disrupted OTIF',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: tokens.accent },
        areaStyle: { color: `${tokens.accent}1f` },
        data: data.map((point) => point.disrupted),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />;
};

export default RiskTrendChart;
