import React from 'react';

export const ThinkingSpinner: React.FC = () => (
  <div className="flex items-center space-x-1.5 text-gray-300">
    <div className="thinking-dot"></div>
    <div className="thinking-dot"></div>
    <div className="thinking-dot"></div>
  </div>
);
