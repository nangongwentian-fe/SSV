import { PerformanceOptimizer } from './PerformanceOptimizer';
import { globalTimerManager } from './TimerManager';

// 性能指标类型
export interface PerformanceMetrics {
  // 页面加载性能
  pageLoad: {
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
  };
  
  // 内存使用
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
  };
  
  // 动画性能
  animation: {
    frameRate: number;
    droppedFrames: number;
    averageFrameTime: number;
    jankCount: number;
  };
  
  // 网络性能
  network: {
    connectionType: string;
    downlink: number;
    rtt: number;
  };
  
  // 自定义指标
  custom: Record<string, number>;
}

// 性能监控配置
interface PerformanceConfig {
  enableMemoryMonitoring: boolean;
  enableAnimationMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  sampleInterval: number;
  maxSamples: number;
  enableConsoleLog: boolean;
  enableLocalStorage: boolean;
}

class PerformanceMonitor {
  private config: PerformanceConfig = {
    enableMemoryMonitoring: true,
    enableAnimationMonitoring: true,
    enableNetworkMonitoring: true,
    sampleInterval: 5000, // 5秒
    maxSamples: 100,
    enableConsoleLog: false,
    enableLocalStorage: true
  };

  private metrics: PerformanceMetrics[] = [];
  private animationFrameId: number | null = null;
  private intervalId: boolean = false;
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private isMonitoring = false;

  constructor(config?: Partial<PerformanceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.setupPerformanceObservers();
  }

  // 设置性能观察器
  private setupPerformanceObservers() {
    if (typeof window === 'undefined') return;

    // 观察页面加载性能
    if ('PerformanceObserver' in window) {
      try {
        // 观察导航时间
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.updatePageLoadMetrics(entry as PerformanceNavigationTiming);
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });

        // 观察绘制时间
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.updateCustomMetric('firstContentfulPaint', entry.startTime);
            }
          });
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        // 观察最大内容绘制
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.updateCustomMetric('largestContentfulPaint', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // 观察布局偏移
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.updateCustomMetric('cumulativeLayoutShift', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance observers not fully supported:', error);
      }
    }
  }

  // 开始监控
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 开始定期采样
    globalTimerManager.setInterval('performance-monitor', () => {
      this.collectMetrics();
    }, this.config.sampleInterval);
    this.intervalId = true;

    // 开始动画性能监控
    if (this.config.enableAnimationMonitoring) {
      this.startAnimationMonitoring();
    }

    console.log('Performance monitoring started');
  }

  // 停止监控
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.intervalId) {
      globalTimerManager.clearInterval('performance-monitor');
      this.intervalId = false;
    }
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    console.log('Performance monitoring stopped');
  }

  // 收集性能指标
  private collectMetrics() {
    const metrics: PerformanceMetrics = {
      pageLoad: this.getPageLoadMetrics(),
      memory: this.getMemoryMetrics(),
      animation: this.getAnimationMetrics(),
      network: this.getNetworkMetrics(),
      custom: {}
    };

    this.metrics.unshift(metrics);
    
    // 限制样本数量
    if (this.metrics.length > this.config.maxSamples) {
      this.metrics = this.metrics.slice(0, this.config.maxSamples);
    }

    // 日志输出
    if (this.config.enableConsoleLog) {
      console.log('Performance metrics:', metrics);
    }

    // 本地存储
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage();
    }
  }

  // 获取页面加载指标
  private getPageLoadMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (!navigation) {
      return {
        domContentLoaded: 0,
        loadComplete: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0
      };
    }

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      firstContentfulPaint: this.getCustomMetric('firstContentfulPaint'),
      largestContentfulPaint: this.getCustomMetric('largestContentfulPaint'),
      firstInputDelay: this.getCustomMetric('firstInputDelay'),
      cumulativeLayoutShift: this.getCustomMetric('cumulativeLayoutShift')
    };
  }

  // 获取内存指标
  private getMemoryMetrics() {
    if (!this.config.enableMemoryMonitoring || !(performance as any).memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usagePercentage: 0
      };
    }

    const memory = (performance as any).memory;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: Math.round(usagePercentage * 100) / 100
    };
  }

  // 获取动画指标
  private getAnimationMetrics() {
    const frameRate = this.frameTimes.length > 0 ? 
      Math.round(1000 / (this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length)) : 0;
    
    const averageFrameTime = this.frameTimes.length > 0 ?
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length : 0;
    
    const jankCount = this.frameTimes.filter(time => time > 16.67).length; // 超过60fps的帧
    const droppedFrames = jankCount;

    return {
      frameRate,
      droppedFrames,
      averageFrameTime: Math.round(averageFrameTime * 100) / 100,
      jankCount
    };
  }

  // 获取网络指标
  private getNetworkMetrics() {
    if (!this.config.enableNetworkMonitoring || !(navigator as any).connection) {
      return {
        connectionType: 'unknown',
        downlink: 0,
        rtt: 0
      };
    }

    const connection = (navigator as any).connection;
    return {
      connectionType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0
    };
  }

  // 开始动画性能监控
  private startAnimationMonitoring() {
    const measureFrame = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const frameTime = timestamp - this.lastFrameTime;
        this.frameTimes.push(frameTime);
        
        // 只保留最近100帧的数据
        if (this.frameTimes.length > 100) {
          this.frameTimes.shift();
        }
      }
      
      this.lastFrameTime = timestamp;
      this.frameCount++;
      
      if (this.isMonitoring) {
        this.animationFrameId = requestAnimationFrame(measureFrame);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(measureFrame);
  }

  // 更新页面加载指标
  private updatePageLoadMetrics(entry: PerformanceNavigationTiming) {
    // 这里可以处理导航时间相关的指标
  }

  // 更新自定义指标
  private updateCustomMetric(name: string, value: number) {
    if (this.metrics.length > 0) {
      this.metrics[0].custom[name] = value;
    }
  }

  // 获取自定义指标
  private getCustomMetric(name: string): number {
    if (this.metrics.length > 0 && this.metrics[0].custom[name]) {
      return this.metrics[0].custom[name];
    }
    return 0;
  }

  // 保存到本地存储
  private saveToLocalStorage() {
    try {
      const data = {
        metrics: this.metrics.slice(0, 10), // 只保存最近10个样本
        timestamp: Date.now()
      };
      localStorage.setItem('performance_metrics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save performance metrics to localStorage:', error);
    }
  }

  // 获取性能报告
  getPerformanceReport() {
    if (this.metrics.length === 0) {
      return null;
    }

    const latest = this.metrics[0];
    const average = this.calculateAverageMetrics();
    
    return {
      latest,
      average,
      samples: this.metrics.length,
      issues: this.detectPerformanceIssues(latest)
    };
  }

  // 计算平均指标
  private calculateAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {} as PerformanceMetrics;
    }

    const sums = this.metrics.reduce((acc, metric) => {
      acc.memory.usedJSHeapSize += metric.memory.usedJSHeapSize;
      acc.memory.usagePercentage += metric.memory.usagePercentage;
      acc.animation.frameRate += metric.animation.frameRate;
      acc.animation.averageFrameTime += metric.animation.averageFrameTime;
      return acc;
    }, {
      memory: { usedJSHeapSize: 0, usagePercentage: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 },
      animation: { frameRate: 0, averageFrameTime: 0, droppedFrames: 0, jankCount: 0 },
      pageLoad: {} as any,
      network: {} as any,
      custom: {}
    });

    const count = this.metrics.length;
    return {
      ...sums,
      memory: {
        ...sums.memory,
        usedJSHeapSize: Math.round(sums.memory.usedJSHeapSize / count),
        usagePercentage: Math.round((sums.memory.usagePercentage / count) * 100) / 100
      },
      animation: {
        ...sums.animation,
        frameRate: Math.round(sums.animation.frameRate / count),
        averageFrameTime: Math.round((sums.animation.averageFrameTime / count) * 100) / 100
      }
    } as PerformanceMetrics;
  }

  // 检测性能问题
  private detectPerformanceIssues(metrics: PerformanceMetrics) {
    const issues: string[] = [];

    // 内存使用过高
    if (metrics.memory.usagePercentage > 80) {
      issues.push('内存使用率过高 (>80%)');
    }

    // 帧率过低
    if (metrics.animation.frameRate < 30) {
      issues.push('帧率过低 (<30fps)');
    }

    // 卡顿过多
    if (metrics.animation.jankCount > 10) {
      issues.push('动画卡顿过多');
    }

    // 页面加载过慢
    if (metrics.pageLoad.loadComplete > 5000) {
      issues.push('页面加载时间过长 (>5s)');
    }

    return issues;
  }

  // 更新配置
  updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // 清除数据
  clearMetrics() {
    this.metrics = [];
    this.frameTimes = [];
    this.frameCount = 0;
    localStorage.removeItem('performance_metrics');
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

// 导出便捷方法
export const startPerformanceMonitoring = () => performanceMonitor.start();
export const stopPerformanceMonitoring = () => performanceMonitor.stop();
export const getPerformanceReport = () => performanceMonitor.getPerformanceReport();
export const clearPerformanceMetrics = () => performanceMonitor.clearMetrics();
export const updatePerformanceConfig = (config: Partial<PerformanceConfig>) => 
  performanceMonitor.updateConfig(config);

export default performanceMonitor;