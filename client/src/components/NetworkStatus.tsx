import React, { useState, useEffect } from 'react';
import { onNetworkStatusChange, getNetworkStatus } from '../lib/gateway-api';

const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(getNetworkStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = onNetworkStatusChange((online) => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  if (isOnline === null) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
          <span>Checking...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`px-3 py-1 rounded-full text-sm flex items-center space-x-2 cursor-pointer transition-colors ${
          isOnline
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-red-500 text-white hover:bg-red-600'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-200' : 'bg-red-200'}`}></div>
        <span>{isOnline ? 'Online' : 'Offline'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>API Gateway:</span>
              <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                {isOnline ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>WebSocket:</span>
              <span className="text-gray-400">Check console</span>
            </div>
            <div className="text-xs text-gray-400 mt-2 pt-2 border-t">
              Click to toggle • Open browser console for detailed network logs
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;