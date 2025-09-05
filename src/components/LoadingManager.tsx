import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * 加载状态接口
 */
interface LoadingState {
  [key: string]: boolean;
}

/**
 * 加载上下文接口
 */
interface LoadingContextType {
  loadingStates: LoadingState;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  isAnyLoading: () => boolean;
  clearAllLoading: () => void;
}

/**
 * 加载上下文
 */
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

/**
 * 加载提供者组件属性
 */
interface LoadingProviderProps {
  children: ReactNode;
}

/**
 * 加载提供者组件
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  const value: LoadingContextType = {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    clearAllLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

/**
 * 使用加载状态的Hook
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

/**
 * 加载指示器组件属性
 */
interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  className?: string;
}

/**
 * 加载指示器组件
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = ''
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
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`} />
      {text && (
        <span className={`ml-2 text-sm ${colorClasses[color]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

/**
 * 全屏加载遮罩组件属性
 */
interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  backdrop?: boolean;
}

/**
 * 全屏加载遮罩组件
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text = '加载中...',
  backdrop = true
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {backdrop && (
        <div className="absolute inset-0 bg-black bg-opacity-50" />
      )}
      <div className="relative bg-white rounded-lg shadow-lg p-6 mx-4">
        <LoadingIndicator size="lg" text={text} className="flex-col" />
      </div>
    </div>
  );
};

/**
 * 按钮加载状态组件属性
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

/**
 * 带加载状态的按钮组件
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`relative ${className} ${loading ? 'cursor-not-allowed' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingIndicator size="sm" color="white" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
};

/**
 * 内容加载包装器组件属性
 */
interface LoadingWrapperProps {
  loading: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: string;
  className?: string;
}

/**
 * 内容加载包装器组件
 */
export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  loading,
  children,
  fallback,
  minHeight = '200px',
  className = ''
}) => {
  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ minHeight }}
      >
        {fallback || <LoadingIndicator size="lg" text="加载中..." />}
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * 骨架屏组件属性
 */
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  animate?: boolean;
}

/**
 * 骨架屏组件
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  className = '',
  animate = true
}) => {
  return (
    <div
      className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{ width, height }}
    />
  );
};

/**
 * 卡片骨架屏组件
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <Skeleton height="24px" className="mb-3" />
      <Skeleton height="16px" className="mb-2" />
      <Skeleton height="16px" width="80%" className="mb-4" />
      <div className="flex space-x-2">
        <Skeleton width="60px" height="32px" />
        <Skeleton width="60px" height="32px" />
      </div>
    </div>
  );
};

/**
 * 表格骨架屏组件
 */
export const TableSkeleton: React.FC<{ 
  rows?: number; 
  columns?: number; 
  className?: string; 
}> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 表头 */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} height="20px" className="flex-1" />
        ))}
      </div>
      
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="16px" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * 高阶组件：为组件添加加载状态
 */
export function withLoading<P extends object>(
  Component: React.ComponentType<P>,
  loadingKey: string
) {
  const WrappedComponent = (props: P) => {
    const { isLoading } = useLoading();
    const loading = isLoading(loadingKey);

    return (
      <LoadingWrapper loading={loading}>
        <Component {...props} />
      </LoadingWrapper>
    );
  };
  
  WrappedComponent.displayName = `withLoading(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook：异步操作加载状态管理
 */
export const useAsyncLoading = (key: string) => {
  const { setLoading, isLoading } = useLoading();
  
  const executeWithLoading = useCallback(
    async (asyncFn: () => Promise<any>): Promise<any> => {
      try {
        setLoading(key, true);
        const result = await asyncFn();
        return result;
      } finally {
        setLoading(key, false);
      }
    },
    [key, setLoading]
  );
  
  return {
    loading: isLoading(key),
    executeWithLoading
  };
};