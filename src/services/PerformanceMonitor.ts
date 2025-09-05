/**
 * 性能监控器
 * 负责监控应用的性能指标，包括FPS、内存使用、渲染时间等
 */

import { globalTimerManager } from '../utils/TimerManager';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number; // MB
  renderTime: number; // ms
  loadTime: number; // ms
  timestamp: number;
}

export interface PerformanceStats {
  current: PerformanceMetrics;
  average: PerformanceMetrics;
  peak: PerformanceMetrics;
  history: PerformanceMetrics[];
  animationStats?: {
    activeAnimations?: number;
    renderQueueSize?: number;
    actualFPS?: number;
  };
  customMetrics?: {
    [key: string]: number;
  };
}

export class PerformanceMonitor {
  private isRunning: boolean = false;
  private isDestroyed: boolean = false;
  private metrics: PerformanceMetrics[] = [];
  private maxHistorySize: number = 100;
  private updateInterval: number = 1000; // 1秒更新一次
  private intervalId: string | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private renderStartTime: number = 0;
  private loadStartTime: number = 0;
  private listeners: Set<(stats: PerformanceStats) => void> = new Set();
  private currentStats: PerformanceStats = {
    current: { fps: 0, memoryUsage: 0, renderTime: 0, loadTime: 0, timestamp: Date.now() },
    average: { fps: 0, memoryUsage: 0, renderTime: 0, loadTime: 0, timestamp: Date.now() },
    peak: { fps: 0, memoryUsage: 0, renderTime: 0, loadTime: 0, timestamp: Date.now() },
    history: [],
    animationStats: {},
    customMetrics: {}
  };

  constructor() {
    this.loadStartTime = performance.now();
    this.bindPerformanceObserver();
  }

  /**
   * 绑定性能观察器
   */
  private bindPerformanceObserver(): void {
    try {
      // 监听导航性能
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.loadStartTime = navEntry.loadEventEnd - navEntry.fetchStart;
            }
          });
        });
        
        observer.observe({ entryTypes: ['navigation'] });
      }
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  /**
   * 启动性能监控
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Performance monitor is already running');
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    
    // 启动FPS监控
    this.startFPSMonitoring();
    
    // 启动定期性能收集
    globalTimerManager.setInterval('performance-monitor', () => {
      this.collectMetrics();
    }, this.updateInterval);
    this.intervalId = 'performance-monitor';
    
    console.log('Performance monitoring started');
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Performance monitor is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      globalTimerManager.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('Performance monitoring stopped');
  }

  /**
   * 启动FPS监控
   */
  private startFPSMonitoring(): void {
    const measureFPS = () => {
      if (!this.isRunning) return;
      
      const currentTime = performance.now();
      this.frameCount++;
      
      // 每秒计算一次FPS
      if (currentTime - this.lastFrameTime >= 1000) {
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
        this.fpsHistory.push(fps);
        
        // 保持历史记录在合理范围内
        if (this.fpsHistory.length > 60) {
          this.fpsHistory.shift();
        }
        
        this.frameCount = 0;
        this.lastFrameTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * 收集性能指标
   */
  private collectMetrics(): void {
    try {
      const currentTime = performance.now();
      const memoryInfo = this.getMemoryUsage();
      const currentFPS = this.getCurrentFPS();
      const renderTime = this.getRenderTime();
      const loadTime = currentTime - this.loadStartTime;
      
      const metrics: PerformanceMetrics = {
        fps: currentFPS,
        memoryUsage: memoryInfo,
        renderTime: renderTime,
        loadTime: loadTime,
        timestamp: Date.now()
      };
      
      this.metrics.push(metrics);
      
      // 保持历史记录在合理范围内
      if (this.metrics.length > this.maxHistorySize) {
        this.metrics.shift();
      }
      
      // 通知监听器
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return Math.round(memory.usedJSHeapSize / 1024 / 1024); // 转换为MB
      }
      return 0;
    } catch (error) {
      console.warn('Memory API not available:', error);
      return 0;
    }
  }

  /**
   * 获取当前FPS
   */
  private getCurrentFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1] || 0;
  }

  /**
   * 获取渲染时间
   */
  private getRenderTime(): number {
    try {
      const entries = performance.getEntriesByType('measure');
      const renderEntries = entries.filter(entry => entry.name.includes('render'));
      
      if (renderEntries.length > 0) {
        const latestEntry = renderEntries[renderEntries.length - 1];
        return Math.round(latestEntry.duration);
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 标记渲染开始
   */
  markRenderStart(): void {
    this.renderStartTime = performance.now();
    try {
      performance.mark('render-start');
    } catch (error) {
      // Performance API not available
    }
  }

  /**
   * 标记渲染结束
   */
  markRenderEnd(): void {
    try {
      performance.mark('render-end');
      performance.measure('render-duration', 'render-start', 'render-end');
    } catch (error) {
      // Performance API not available
    }
  }

  /**
   * 获取性能统计
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      const emptyMetrics: PerformanceMetrics = {
        fps: 0,
        memoryUsage: 0,
        renderTime: 0,
        loadTime: 0,
        timestamp: Date.now()
      };
      
      return {
        current: emptyMetrics,
        average: emptyMetrics,
        peak: emptyMetrics,
        history: []
      };
    }
    
    const current = this.metrics[this.metrics.length - 1];
    const average = this.calculateAverage();
    const peak = this.calculatePeak();
    
    return {
      current,
      average,
      peak,
      history: [...this.metrics]
    };
  }

  /**
   * 计算平均值
   */
  private calculateAverage(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        fps: 0,
        memoryUsage: 0,
        renderTime: 0,
        loadTime: 0,
        timestamp: Date.now()
      };
    }
    
    const sum = this.metrics.reduce((acc, metric) => ({
      fps: acc.fps + metric.fps,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      renderTime: acc.renderTime + metric.renderTime,
      loadTime: acc.loadTime + metric.loadTime,
      timestamp: acc.timestamp
    }), {
      fps: 0,
      memoryUsage: 0,
      renderTime: 0,
      loadTime: 0,
      timestamp: Date.now()
    });
    
    const count = this.metrics.length;
    
    return {
      fps: Math.round(sum.fps / count),
      memoryUsage: Math.round(sum.memoryUsage / count),
      renderTime: Math.round(sum.renderTime / count),
      loadTime: Math.round(sum.loadTime / count),
      timestamp: Date.now()
    };
  }

  /**
   * 计算峰值
   */
  private calculatePeak(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        fps: 0,
        memoryUsage: 0,
        renderTime: 0,
        loadTime: 0,
        timestamp: Date.now()
      };
    }
    
    return this.metrics.reduce((peak, metric) => ({
      fps: Math.max(peak.fps, metric.fps),
      memoryUsage: Math.max(peak.memoryUsage, metric.memoryUsage),
      renderTime: Math.max(peak.renderTime, metric.renderTime),
      loadTime: Math.max(peak.loadTime, metric.loadTime),
      timestamp: Date.now()
    }));
  }

  /**
   * 添加性能监听器
   */
  addListener(callback: (stats: PerformanceStats) => void): void {
    this.listeners.add(callback);
  }

  /**
   * 移除性能监听器
   */
  removeListener(callback: (stats: PerformanceStats) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(callback => {
      try {
        callback(stats);
      } catch (error) {
        console.error('Error in performance listener:', error);
      }
    });
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.metrics = [];
    this.fpsHistory = [];
    console.log('Performance history cleared');
  }

  /**
   * 导出性能报告
   */
  exportReport(): string {
    const stats = this.getStats();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        current: stats.current,
        average: stats.average,
        peak: stats.peak
      },
      history: stats.history,
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * 更新动画统计数据
   */
  updateAnimationStats(animationStats: {
    activeAnimations: number;
    renderQueueSize: number;
    actualFPS: number;
  }): void {
    if (this.isDestroyed) return;
    
    this.currentStats.animationStats = {
      ...this.currentStats.animationStats,
      ...animationStats
    };
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(name: string, value: number): void {
    if (this.isDestroyed) return;
    
    if (!this.currentStats.customMetrics) {
      this.currentStats.customMetrics = {};
    }
    
    this.currentStats.customMetrics[name] = value;
  }

  /**
   * 销毁性能监控器
   */
  destroy(): void {
    this.stop();
    this.listeners.clear();
    this.metrics = [];
    this.fpsHistory = [];
    this.isDestroyed = true;
    console.log('Performance monitor destroyed');
  }

  /**
   * 获取运行状态
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }
}

// 全局单例实例
let performanceMonitorInstance: PerformanceMonitor | null = null;

/**
 * 获取性能监控器全局单例
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
    // 将实例挂载到window对象上，供其他服务使用
    (window as any).performanceMonitor = performanceMonitorInstance;
  }
  return performanceMonitorInstance;
}

// 导出单例实例
export const performanceMonitor = new PerformanceMonitor();