import React from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from '../ui/button';

const ThemeToggle = () => {
  const { theme, toggleTheme, hydrated } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="relative"
    >
      {hydrated && theme === 'dark' ? <SunMedium size={17} /> : <MoonStar size={17} />}
    </Button>
  );
};

export default ThemeToggle;
