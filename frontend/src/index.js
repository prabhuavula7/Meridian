import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { ThemeProvider } from './components/theme/ThemeProvider';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={140}>
        <App />
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border-default))',
              color: 'rgb(var(--fg-primary))',
            },
          }}
        />
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>
);
