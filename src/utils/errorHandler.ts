// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  CLIENT = 'CLIENT',
  SERVER = 'SERVER',
  ANIMATION = 'ANIMATION',
  MAP = 'MAP',
  UNKNOWN = 'UNKNOWN'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 错误信息接口
export interface ErrorInfo {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
}

// 错误处理器配置
interface ErrorHandlerConfig {
  enableConsoleLog: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  enableUserNotification: boolean;
}

class ErrorHandler {
  private config: ErrorHandlerConfig = {
    enableConsoleLog: true,
    enableLocalStorage: true,
    maxStoredErrors: 50,
    enableUserNotification: true
  };

  private errors: ErrorInfo[] = [];
  private errorListeners: Array<(error: ErrorInfo) => void> = [];

  constructor() {
    this.setupGlobalErrorHandlers();
    this.loadStoredErrors();
  }

  // 设置全局错误处理器
  private setupGlobalErrorHandlers() {
    // 处理未捕获的JavaScript错误
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message),
        ErrorType.CLIENT,
        ErrorSeverity.HIGH,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          source: 'window.error'
        }
      );
    });

    // 处理未捕获的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(event.reason?.message || 'Unhandled Promise Rejection'),
        ErrorType.CLIENT,
        ErrorSeverity.HIGH,
        {
          reason: event.reason,
          source: 'unhandledrejection'
        }
      );
    });
  }

  // 主要错误处理方法
  handleError(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): string {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      type,
      severity,
      message: errorObj.message,
      stack: errorObj.stack,
      timestamp: Date.now(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 添加到错误列表
    this.errors.unshift(errorInfo);
    
    // 限制存储的错误数量
    if (this.errors.length > this.config.maxStoredErrors) {
      this.errors = this.errors.slice(0, this.config.maxStoredErrors);
    }

    // 控制台日志
    if (this.config.enableConsoleLog) {
      this.logToConsole(errorInfo);
    }

    // 本地存储
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage();
    }

    // 通知监听器
    this.notifyListeners(errorInfo);

    // 用户通知
    if (this.config.enableUserNotification && severity === ErrorSeverity.CRITICAL) {
      this.showUserNotification(errorInfo);
    }

    return errorInfo.id;
  }

  // 生成错误ID
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 控制台日志
  private logToConsole(errorInfo: ErrorInfo) {
    const logMethod = this.getConsoleMethod(errorInfo.severity);
    const prefix = `[${errorInfo.type}:${errorInfo.severity}]`;
    
    logMethod(
      `${prefix} ${errorInfo.message}`,
      {
        id: errorInfo.id,
        timestamp: new Date(errorInfo.timestamp).toISOString(),
        context: errorInfo.context,
        stack: errorInfo.stack
      }
    );
  }

  // 获取对应的控制台方法
  private getConsoleMethod(severity: ErrorSeverity) {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  // 保存到本地存储
  private saveToLocalStorage() {
    try {
      const errorData = {
        errors: this.errors.slice(0, 20), // 只保存最近20个错误
        lastUpdated: Date.now()
      };
      localStorage.setItem('app_errors', JSON.stringify(errorData));
    } catch (e) {
      console.warn('Failed to save errors to localStorage:', e);
    }
  }

  // 从本地存储加载错误
  private loadStoredErrors() {
    try {
      const stored = localStorage.getItem('app_errors');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.errors && Array.isArray(data.errors)) {
          this.errors = data.errors;
        }
      }
    } catch (e) {
      console.warn('Failed to load errors from localStorage:', e);
    }
  }

  // 通知监听器
  private notifyListeners(errorInfo: ErrorInfo) {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (e) {
        console.warn('Error in error listener:', e);
      }
    });
  }

  // 显示用户通知
  private showUserNotification(errorInfo: ErrorInfo) {
    // 这里可以集成toast通知或其他用户通知方式
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('应用程序错误', {
        body: `发生了一个严重错误: ${errorInfo.message}`,
        icon: '/favicon.ico'
      });
    }
  }

  // 添加错误监听器
  addErrorListener(listener: (error: ErrorInfo) => void) {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // 获取错误列表
  getErrors(filter?: {
    type?: ErrorType;
    severity?: ErrorSeverity;
    limit?: number;
  }): ErrorInfo[] {
    let filteredErrors = [...this.errors];

    if (filter?.type) {
      filteredErrors = filteredErrors.filter(error => error.type === filter.type);
    }

    if (filter?.severity) {
      filteredErrors = filteredErrors.filter(error => error.severity === filter.severity);
    }

    if (filter?.limit) {
      filteredErrors = filteredErrors.slice(0, filter.limit);
    }

    return filteredErrors;
  }

  // 清除错误
  clearErrors(filter?: { type?: ErrorType; severity?: ErrorSeverity }) {
    if (!filter) {
      this.errors = [];
    } else {
      this.errors = this.errors.filter(error => {
        if (filter.type && error.type === filter.type) return false;
        if (filter.severity && error.severity === filter.severity) return false;
        return true;
      });
    }
    
    this.saveToLocalStorage();
  }

  // 获取错误统计
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: this.errors.filter(error => 
        Date.now() - error.timestamp < 24 * 60 * 60 * 1000
      ).length
    };

    this.errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  // 更新配置
  updateConfig(newConfig: Partial<ErrorHandlerConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局实例
const errorHandler = new ErrorHandler();

// 导出便捷方法
export const handleError = (
  error: Error | string,
  type?: ErrorType,
  severity?: ErrorSeverity,
  context?: Record<string, any>
) => errorHandler.handleError(error, type, severity, context);

export const addErrorListener = (listener: (error: ErrorInfo) => void) => 
  errorHandler.addErrorListener(listener);

export const getErrors = (filter?: {
  type?: ErrorType;
  severity?: ErrorSeverity;
  limit?: number;
}) => errorHandler.getErrors(filter);

export const clearErrors = (filter?: { type?: ErrorType; severity?: ErrorSeverity }) => 
  errorHandler.clearErrors(filter);

export const getErrorStats = () => errorHandler.getErrorStats();

export const updateErrorConfig = (config: Partial<ErrorHandlerConfig>) => 
  errorHandler.updateConfig(config);

export default errorHandler;