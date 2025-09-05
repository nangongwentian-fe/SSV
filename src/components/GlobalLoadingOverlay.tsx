import React from 'react';
import { useLoadingStore } from '../store/loadingStore';
import LoadingSpinner from './LoadingSpinner';

const GlobalLoadingOverlay: React.FC = () => {
  const { isLoading, loadingText } = useLoadingStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <LoadingSpinner size="lg" text={loadingText} className="flex-col space-x-0 space-y-3" />
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;