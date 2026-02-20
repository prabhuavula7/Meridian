import React from 'react';

const Header = () => {
  return (
    <header className="bg-dark-900 border-b border-dark-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-lg flex items-center justify-center">
              <svg
                viewBox="0 0 64 64"
                className="w-6 h-6 text-white"
                aria-label="BentTech.AI logo mark"
                role="img"
              >
                <rect x="8" y="8" width="14" height="48" rx="3" fill="currentColor" />
                <path d="M24 8h18c8 0 14 5 14 12 0 6-4 10-9 11 6 1 11 6 11 13 0 8-7 14-16 14H24V8Zm12 20h6c4 0 6-2 6-5s-2-5-6-5h-6v10Zm0 22h8c4 0 7-3 7-7s-3-7-7-7h-8v14Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BentTech.AI</h1>
              <p className="text-sm text-dark-400">Supply Chain AI Platform</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
