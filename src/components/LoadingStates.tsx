import React from 'react';
import { cn } from '../utils/cn';

// 加载状态类型
export type LoadingType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';

// 基础加载组件属性
interface BaseLoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
}

// 旋转加载器
export const SpinnerLoader: React.FC<BaseLoadingProps> = ({ 
  className, 
  size = 'md', 
  color = 'primary' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <div className={cn('animate-spin', sizeClasses[size], colorClasses[color], className)}>
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// 点状加载器
export const DotsLoader: React.FC<BaseLoadingProps> = ({ 
  className, 
  size = 'md', 
  color = 'primary' 
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const colorClasses = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600',
    white: 'bg-white'
  };

  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};

// 脉冲加载器
export const PulseLoader: React.FC<BaseLoadingProps & { children?: React.ReactNode }> = ({ 
  className, 
  size = 'md', 
  color = 'primary',
  children 
}) => {
  const colorClasses = {
    primary: 'bg-blue-200',
    secondary: 'bg-gray-200',
    white: 'bg-white/20'
  };

  return (
    <div className={cn('animate-pulse', colorClasses[color], className)}>
      {children}
    </div>
  );
};

// 骨架屏加载器
export const SkeletonLoader: React.FC<{
  className?: string;
  lines?: number;
  avatar?: boolean;
  width?: string;
  height?: string;
}> = ({ 
  className, 
  lines = 3, 
  avatar = false, 
  width = 'w-full', 
  height = 'h-4' 
}) => {
  return (
    <div className={cn('animate-pulse', className)}>
      {avatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-10 h-10 bg-gray-300 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2" />
            <div className="h-3 bg-gray-300 rounded w-1/2" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'bg-gray-300 rounded',
              height,
              i === lines - 1 ? 'w-3/4' : width
            )}
          />
        ))}
      </div>
    </div>
  );
};

// 进度条加载器
export const ProgressLoader: React.FC<{
  progress: number;
  className?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}> = ({ 
  progress, 
  className, 
  showPercentage = true, 
  color = 'primary' 
}) => {
  const colorClasses = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('w-full', className)}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">加载中...</span>
          <span className="text-sm text-gray-600">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', colorClasses[color])}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// 全屏加载覆盖层
export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  message?: string;
  type?: LoadingType;
  className?: string;
}> = ({ 
  isVisible, 
  message = '加载中...', 
  type = 'spinner', 
  className 
}) => {
  if (!isVisible) return null;

  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return <SpinnerLoader size="lg" color="white" />;
      case 'dots':
        return <DotsLoader size="lg" color="white" />;
      case 'pulse':
        return <PulseLoader size="lg" color="white" />;
      default:
        return <SpinnerLoader size="lg" color="white" />;
    }
  };

  return (
    <div className={cn(
      'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
      className
    )}>
      <div className="bg-gray-800 rounded-lg p-6 flex flex-col items-center space-y-4 min-w-[200px]">
        {renderLoader()}
        <p className="text-white text-sm">{message}</p>
      </div>
    </div>
  );
};

// 内联加载组件
export const InlineLoader: React.FC<{
  type?: LoadingType;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  type = 'spinner', 
  message, 
  className, 
  size = 'md' 
}) => {
  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return <SpinnerLoader size={size} />;
      case 'dots':
        return <DotsLoader size={size} />;
      case 'pulse':
        return <PulseLoader size={size} />;
      default:
        return <SpinnerLoader size={size} />;
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {renderLoader()}
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
};

// 按钮加载状态
export const LoadingButton: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loadingText?: string;
}> = ({ 
  isLoading, 
  children, 
  onClick, 
  disabled, 
  className, 
  loadingText = '加载中...' 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'flex items-center justify-center space-x-2 px-4 py-2 rounded transition-all',
        'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white',
        'disabled:cursor-not-allowed',
        className
      )}
    >
      {isLoading && <SpinnerLoader size="sm" color="white" />}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
};

// 卡片加载状态
export const LoadingCard: React.FC<{
  className?: string;
  title?: boolean;
  avatar?: boolean;
  lines?: number;
}> = ({ 
  className, 
  title = true, 
  avatar = false, 
  lines = 3 
}) => {
  return (
    <div className={cn('bg-white rounded-lg p-4 border', className)}>
      {title && (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4" />
        </div>
      )}
      <SkeletonLoader avatar={avatar} lines={lines} />
    </div>
  );
};

export default {
  SpinnerLoader,
  DotsLoader,
  PulseLoader,
  SkeletonLoader,
  ProgressLoader,
  LoadingOverlay,
  InlineLoader,
  LoadingButton,
  LoadingCard
};