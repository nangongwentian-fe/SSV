import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '../utils/cn';
import { useTimerManager } from '../hooks/useCleanup';
import { globalTimerManager } from '../utils/TimerManager';

// Toast类型
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast配置
export interface ToastConfig {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast上下文
interface ToastContextType {
  toasts: ToastConfig[];
  addToast: (config: Omit<ToastConfig, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const addToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastConfig = {
      ...config,
      id,
      duration: config.duration ?? 5000
    };

    setToasts(prev => [...prev, toast]);

    // 自动移除（除非是持久化的）
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      // 使用全局定时器管理器
      const timerId = `toast-${id}`;
      globalTimerManager.setTimeout(timerId, () => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// 便捷方法
export const useToastMethods = () => {
  const { addToast } = useToast();

  return {
    success: (message: string, options?: Partial<ToastConfig>) => 
      addToast({ ...options, type: 'success', message }),
    error: (message: string, options?: Partial<ToastConfig>) => 
      addToast({ ...options, type: 'error', message }),
    warning: (message: string, options?: Partial<ToastConfig>) => 
      addToast({ ...options, type: 'warning', message }),
    info: (message: string, options?: Partial<ToastConfig>) => 
      addToast({ ...options, type: 'info', message })
  };
};

// Toast容器
const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} config={toast} />
      ))}
    </div>
  );
};

// Toast项目
const ToastItem: React.FC<{ config: ToastConfig }> = ({ config }) => {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { setTimeout } = useTimerManager();

  useEffect(() => {
    // 进入动画
    setTimeout(() => setIsVisible(true), 10);
  }, [setTimeout]);

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      removeToast(config.id);
    }, 300); // 等待退出动画完成
  }, [config.id, removeToast, setTimeout]);

  const getTypeStyles = () => {
    switch (config.type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: 'text-green-600',
          iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={cn(
        'transform transition-all duration-300 ease-in-out',
        'border rounded-lg shadow-lg p-4',
        styles.bg,
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start space-x-3">
        {/* 图标 */}
        <div className={cn('flex-shrink-0 w-5 h-5', styles.icon)}>
          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={styles.iconPath} />
          </svg>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {config.title && (
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              {config.title}
            </h4>
          )}
          <p className="text-sm text-gray-700">
            {config.message}
          </p>
          {config.action && (
            <button
              onClick={config.action.onClick}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              {config.action.label}
            </button>
          )}
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 进度条（如果有持续时间） */}
      {!config.persistent && config.duration && config.duration > 0 && (
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <div
            className={cn(
              'h-1 rounded-full transition-all ease-linear',
              config.type === 'success' && 'bg-green-600',
              config.type === 'error' && 'bg-red-600',
              config.type === 'warning' && 'bg-yellow-600',
              config.type === 'info' && 'bg-blue-600'
            )}
            style={{
              width: '100%',
              animation: `shrink ${config.duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

// 全局样式（需要添加到CSS中）
const toastStyles = `
@keyframes shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = toastStyles;
  document.head.appendChild(styleElement);
}

export default {
  ToastProvider,
  useToast,
  useToastMethods
};