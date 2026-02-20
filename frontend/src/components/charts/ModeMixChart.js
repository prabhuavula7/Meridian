import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useChartTokens } from './useChartTokens';

const modeLabels = {
  sea: 'Sea',
  air: 'Air',
  road: 'Road',
  rail: 'Rail',
  multimodal: 'Multi',
};

const ModeMixChart = ({ data = [] }) => {
  const tokens = useChartTokens();

  const option = {
    animationDuration: 280,
    grid: { left: 34, right: 16, top: 24, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tokens.surface,
      borderColor: tokens.grid,
      textStyle: { color: tokens.text, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: data.map((point) => modeLabels[point.mode] || point.mode),
      axisLine: { lineStyle: { color: tokens.grid } },
      axisLabel: { color: tokens.muted, fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        splitLine: { lineStyle: { color: tokens.grid } },
        axisLabel: { color: tokens.muted, fontSize: 11 },
      },
      {
        type: 'value',
        min: 0,
        max: 1,
        axisLabel: { color: tokens.muted, formatter: (value) => `${Math.round(value * 100)}%` },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Routes',
        type: 'bar',
        barWidth: 18,
        data: data.map((point) => point.count),
        itemStyle: {
          color: tokens.accent,
          borderRadius: [6, 6, 0, 0],
        },
      },
      {
        name: 'Avg Risk',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 7,
        lineStyle: { color: tokens.gold, width: 2 },
        itemStyle: { color: tokens.gold },
        data: data.map((point) => point.avgRisk),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />;
};

export default ModeMixChart;
