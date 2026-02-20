import { useEffect, useState } from 'react';

const readRawToken = (name, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

export const useChartTokens = () => {
  const [tokens, setTokens] = useState({
    text: 'rgb(237 237 239)',
    muted: 'rgb(139 143 152)',
    grid: 'rgba(38, 38, 49, 0.45)',
    accent: 'rgb(91 42 174)',
    gold: 'rgb(201 164 76)',
    danger: 'rgb(223 86 113)',
    surface: 'rgb(16 16 21)',
  });

  useEffect(() => {
    const update = () => {
      const fg = readRawToken('--fg-primary', '237 237 239');
      const muted = readRawToken('--fg-muted', '139 143 152');
      const border = readRawToken('--border-default', '38 38 49');
      const accent = readRawToken('--accent-base', '91 42 174');
      const gold = readRawToken('--gold-base', '201 164 76');
      const danger = readRawToken('--danger', '223 86 113');
      const surface = readRawToken('--surface', '16 16 21');

      setTokens({
        text: `rgb(${fg})`,
        muted: `rgb(${muted})`,
        grid: `rgba(${border}, 0.5)`,
        accent: `rgb(${accent})`,
        gold: `rgb(${gold})`,
        danger: `rgb(${danger})`,
        surface: `rgb(${surface})`,
      });
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  return tokens;
};
