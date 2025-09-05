/**
 * 内存泄漏检测器
 * 自动检测和报告内存泄漏问题
 */
import { globalTimerManager } from './TimerManager';
import { globalPerformanceOptimizer } from './PerformanceOptimizer';

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  activeTimers: number;
  activeCallbacks: number;
  customMetrics?: Record<string, number>;
}

interface LeakDetectionConfig {
  enabled: boolean;
  checkInterval: number; // 检测间隔（毫秒）
  snapshotRetention: number; // 保留快照数量
  memoryGrowthThreshold: number; // 内存增长阈值（MB）
  timerLeakThreshold: number; // 定时器泄漏阈值
  autoCleanup: boolean; // 自动清理
  reportCallback?: (report: LeakReport) => void;
}

interface LeakReport {
  type: 'memory' | 'timer' | 'callback';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: number;
  suggestions: string[];
}

class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private config: LeakDetectionConfig;
  private snapshots: MemorySnapshot[] = [];
  private detectionTimerId = 'memory-leak-detector';
  private isRunning = false;
  private leakReports: LeakReport[] = [];
  private baselineSnapshot?: MemorySnapshot;

  private constructor() {
    this.config = {
      enabled: true,
      checkInterval: 30000, // 30秒检测一次
      snapshotRetention: 20, // 保留20个快照
      memoryGrowthThreshold: 50, // 50MB增长阈值
      timerLeakThreshold: 100, // 100个定时器阈值
      autoCleanup: false, // 默认不自动清理
      reportCallback: this.defaultReportCallback.bind(this)
    };
  }

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  /**
   * 启动内存泄漏检测
   */
  start(config?: Partial<LeakDetectionConfig>): void {
    if (this.isRunning) {
      console.warn('内存泄漏检测已在运行');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (!this.config.enabled) {
      console.log('内存泄漏检测已禁用');
      return;
    }

    // 创建基线快照
    this.baselineSnapshot = this.createSnapshot();
    this.snapshots.push(this.baselineSnapshot);

    // 启动定期检测
    globalTimerManager.setInterval(this.detectionTimerId, () => {
      this.performDetection();
    }, this.config.checkInterval);

    this.isRunning = true;
    console.log('内存泄漏检测已启动', this.config);
  }

  /**
   * 停止内存泄漏检测
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    globalTimerManager.clearInterval(this.detectionTimerId);
    this.isRunning = false;
    console.log('内存泄漏检测已停止');
  }

  /**
   * 执行检测
   */
  private performDetection(): void {
    try {
      const snapshot = this.createSnapshot();
      this.snapshots.push(snapshot);

      // 保持快照数量限制
      if (this.snapshots.length > this.config.snapshotRetention) {
        this.snapshots.shift();
      }

      // 执行各种检测
      this.detectMemoryLeaks(snapshot);
      this.detectTimerLeaks(snapshot);
      this.detectTrendAnalysis();

    } catch (error) {
      console.error('内存泄漏检测失败:', error);
    }
  }

  /**
   * 创建内存快照
   */
  private createSnapshot(): MemorySnapshot {
    const timerStats = globalTimerManager.getStats();
    const performanceStats = globalPerformanceOptimizer.getPerformanceMetrics() || {
        fps: 60,
        memoryUsage: 50,
        renderTime: 0,
        loadTime: 0
      };

    let memoryInfo = {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };

    // 获取内存信息
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    return {
      timestamp: Date.now(),
      ...memoryInfo,
      activeTimers: timerStats.total,
      activeCallbacks: 0, // 暂时设为0，因为PerformanceMetrics中没有此属性
      customMetrics: {
        renderQueueSize: 0, // 暂时设为0，因为PerformanceMetrics中没有此属性
        animationCount: 0 // 暂时设为0，因为PerformanceMetrics中没有此属性
      }
    };
  }

  /**
   * 检测内存泄漏
   */
  private detectMemoryLeaks(currentSnapshot: MemorySnapshot): void {
    if (!this.baselineSnapshot || this.snapshots.length < 3) {
      return;
    }

    const memoryGrowth = (currentSnapshot.usedJSHeapSize - this.baselineSnapshot.usedJSHeapSize) / (1024 * 1024);
    
    if (memoryGrowth > this.config.memoryGrowthThreshold) {
      const report: LeakReport = {
        type: 'memory',
        severity: memoryGrowth > 200 ? 'critical' : memoryGrowth > 100 ? 'high' : 'medium',
        message: `检测到内存泄漏：内存使用增长 ${memoryGrowth.toFixed(2)}MB`,
        details: {
          baseline: this.baselineSnapshot.usedJSHeapSize,
          current: currentSnapshot.usedJSHeapSize,
          growth: memoryGrowth,
          growthPercentage: ((memoryGrowth / (this.baselineSnapshot.usedJSHeapSize / (1024 * 1024))) * 100).toFixed(2)
        },
        timestamp: Date.now(),
        suggestions: [
          '检查是否有未清理的事件监听器',
          '检查是否有未清理的定时器',
          '检查是否有循环引用',
          '检查大对象是否正确释放'
        ]
      };

      this.reportLeak(report);
    }
  }

  /**
   * 检测定时器泄漏
   */
  private detectTimerLeaks(currentSnapshot: MemorySnapshot): void {
    if (currentSnapshot.activeTimers > this.config.timerLeakThreshold) {
      const report: LeakReport = {
        type: 'timer',
        severity: currentSnapshot.activeTimers > 500 ? 'critical' : currentSnapshot.activeTimers > 200 ? 'high' : 'medium',
        message: `检测到定时器泄漏：活跃定时器数量 ${currentSnapshot.activeTimers}`,
        details: {
          activeTimers: currentSnapshot.activeTimers,
          threshold: this.config.timerLeakThreshold,
          timerStats: globalTimerManager.getStats()
        },
        timestamp: Date.now(),
        suggestions: [
          '检查组件卸载时是否清理了定时器',
          '使用TimerManager统一管理定时器',
          '检查是否有重复创建的定时器'
        ]
      };

      this.reportLeak(report);
    }
  }

  /**
   * 趋势分析
   */
  private detectTrendAnalysis(): void {
    if (this.snapshots.length < 5) {
      return;
    }

    const recentSnapshots = this.snapshots.slice(-5);
    const memoryTrend = this.calculateTrend(recentSnapshots.map(s => s.usedJSHeapSize));
    const timerTrend = this.calculateTrend(recentSnapshots.map(s => s.activeTimers));

    // 检测持续增长趋势
    if (memoryTrend > 0.8) { // 强正相关
      const report: LeakReport = {
        type: 'memory',
        severity: 'medium',
        message: '检测到内存持续增长趋势',
        details: {
          trend: memoryTrend,
          recentGrowth: recentSnapshots[recentSnapshots.length - 1].usedJSHeapSize - recentSnapshots[0].usedJSHeapSize
        },
        timestamp: Date.now(),
        suggestions: [
          '监控内存使用情况',
          '检查是否有缓慢的内存泄漏',
          '考虑增加内存清理频率'
        ]
      };

      this.reportLeak(report);
    }

    if (timerTrend > 0.8) {
      const report: LeakReport = {
        type: 'timer',
        severity: 'medium',
        message: '检测到定时器数量持续增长趋势',
        details: {
          trend: timerTrend,
          recentGrowth: recentSnapshots[recentSnapshots.length - 1].activeTimers - recentSnapshots[0].activeTimers
        },
        timestamp: Date.now(),
        suggestions: [
          '检查定时器清理逻辑',
          '避免重复创建定时器',
          '使用统一的定时器管理'
        ]
      };

      this.reportLeak(report);
    }
  }

  /**
   * 计算趋势（简单线性回归）
   */
  private calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // 计算相关系数
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));
    
    return denomX * denomY === 0 ? 0 : numerator / (denomX * denomY);
  }

  /**
   * 报告泄漏
   */
  private reportLeak(report: LeakReport): void {
    this.leakReports.push(report);
    
    // 保持报告数量限制
    if (this.leakReports.length > 50) {
      this.leakReports.shift();
    }

    // 调用回调函数
    if (this.config.reportCallback) {
      this.config.reportCallback(report);
    }

    // 自动清理（如果启用）
    if (this.config.autoCleanup && report.severity === 'critical') {
      this.performAutoCleanup(report);
    }
  }

  /**
   * 执行自动清理
   */
  private performAutoCleanup(report: LeakReport): void {
    console.warn('执行自动清理:', report.message);
    
    try {
      if (report.type === 'timer') {
        // 清理可能泄漏的定时器
        const stats = globalTimerManager.getStats();
        console.log('清理前定时器统计:', stats);
        
        // 智能清理长时间未使用的定时器
        globalTimerManager.cleanupStaleTimers();
        
        // 如果定时器数量仍然过多，强制清理性能优化器
        if (stats.total > this.config.timerLeakThreshold * 2) {
          globalPerformanceOptimizer.forceMemoryCleanup();
        }
      }
      
      if (report.type === 'memory') {
        // 内存泄漏清理
        const memoryGrowth = report.details?.growth || 0;
        
        if (memoryGrowth > 100) { // 超过100MB增长
          // 强制清理所有缓存
          this.forceCleanupCaches();
          
          // 清理性能优化器
          globalPerformanceOptimizer.forceMemoryCleanup();
          
          // 清理定时器管理器
          globalTimerManager.performMemoryCleanup();
        }
      }
      
      // 触发垃圾回收（如果可用）
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
        console.log('已触发垃圾回收');
      } else if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
        console.log('已触发垃圾回收');
      }
      
      // 记录清理结果
      setTimeout(() => {
        const newSnapshot = this.createSnapshot();
        const memoryReduction = this.snapshots.length > 0 ? 
          (this.snapshots[this.snapshots.length - 1].usedJSHeapSize - newSnapshot.usedJSHeapSize) / (1024 * 1024) : 0;
        
        console.log(`自动清理完成，内存减少: ${memoryReduction.toFixed(2)}MB`);
      }, 1000);
      
    } catch (error) {
      console.error('自动清理失败:', error);
    }
  }
  
  /**
   * 强制清理所有缓存
   */
  private forceCleanupCaches(): void {
    try {
      // 清理可能的全局缓存
      if (typeof window !== 'undefined') {
        // 清理可能的图片缓存
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (img.src && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
          }
        });
        
        // 清理可能的Canvas缓存
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        });
      }
      
      console.log('已清理全局缓存');
    } catch (error) {
      console.error('清理缓存失败:', error);
    }
  }

  /**
   * 默认报告回调
   */
  private defaultReportCallback(report: LeakReport): void {
    const logLevel = report.severity === 'critical' ? 'error' : 
                    report.severity === 'high' ? 'warn' : 'log';
    
    console[logLevel](`[内存泄漏检测] ${report.message}`, {
      type: report.type,
      severity: report.severity,
      details: report.details,
      suggestions: report.suggestions
    });
  }

  /**
   * 获取检测报告
   */
  getReports(type?: 'memory' | 'timer' | 'callback'): LeakReport[] {
    return type ? this.leakReports.filter(r => r.type === type) : [...this.leakReports];
  }

  /**
   * 获取内存快照
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isRunning: boolean;
    config: LeakDetectionConfig;
    snapshotCount: number;
    reportCount: number;
    lastCheck?: number;
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      snapshotCount: this.snapshots.length,
      reportCount: this.leakReports.length,
      lastCheck: this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].timestamp : undefined
    };
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.snapshots = [];
    this.leakReports = [];
    this.baselineSnapshot = undefined;
    console.log('已清除内存泄漏检测历史数据');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LeakDetectionConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.isRunning) {
      // 重启检测以应用新配置
      this.stop();
      this.start();
    }
  }

  /**
   * 销毁检测器
   */
  destroy(): void {
    this.stop();
    this.clearHistory();
    console.log('内存泄漏检测器已销毁');
  }
}

// 导出单例实例
export const globalMemoryLeakDetector = MemoryLeakDetector.getInstance();

// 导出类型
export type { MemorySnapshot, LeakDetectionConfig, LeakReport };

export default MemoryLeakDetector;