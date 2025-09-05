/**
 * 性能优化工具类
 * 统一管理动画引擎、数据模拟器和图层管理器的性能优化
 */

import { globalTimerManager } from './TimerManager';

export interface PerformanceThresholds {
  fps: {
    good: number;
    warning: number;
    critical: number;
  };
  memory: {
    good: number;
    warning: number;
    critical: number;
  };
  renderTime: {
    good: number;
    warning: number;
    critical: number;
  };
  features: {
    maxVisible: number;
    cullThreshold: number;
  };
}

export interface OptimizationConfig {
  enableAutoOptimization: boolean;
  optimizationInterval: number;
  aggressiveMode: boolean;
  memoryCleanupInterval: number;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  visibleFeatures: number;
  culledFeatures: number;
  activeAnimations: number;
  optimizationCount: number;
  lastOptimization: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private isRunning = false;
  private optimizationTimer: boolean = false;
  private memoryCleanupTimer: boolean = false;
  private performanceHistory: PerformanceMetrics[] = [];
  private lastOptimizationTime = 0;
  
  private thresholds: PerformanceThresholds = {
    fps: {
      good: 55,
      warning: 45,
      critical: 30
    },
    memory: {
      good: 50,
      warning: 70,
      critical: 85
    },
    renderTime: {
      good: 3,
      warning: 5,
      critical: 8
    },
    features: {
      maxVisible: 1000,
      cullThreshold: 1500
    }
  };
  
  private config: OptimizationConfig = {
    enableAutoOptimization: true,
    optimizationInterval: 2000, // 2秒检查一次
    aggressiveMode: false,
    memoryCleanupInterval: 30000 // 30秒清理一次内存
  };

  private constructor() {
    this.bindToGlobal();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private bindToGlobal(): void {
    (window as any).performanceOptimizer = this;
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    if (this.config.enableAutoOptimization) {
      this.startOptimizationLoop();
    }
    
    this.startMemoryCleanupLoop();
    console.log('性能优化器已启动');
  }

  public stop(): void {
    this.isRunning = false;
    
    if (this.optimizationTimer) {
      globalTimerManager.clearInterval('performance-optimizer');
      this.optimizationTimer = false;
    }
    
    if (this.memoryCleanupTimer) {
      globalTimerManager.clearInterval('memory-cleanup');
      this.memoryCleanupTimer = false;
    }
    
    console.log('性能优化器已停止');
  }

  private startOptimizationLoop(): void {
    globalTimerManager.setInterval('performance-optimizer', () => {
      this.performOptimization();
    }, this.config.optimizationInterval);
    this.optimizationTimer = true;
  }

  private startMemoryCleanupLoop(): void {
    globalTimerManager.setInterval('memory-cleanup', () => {
      this.performMemoryCleanup();
    }, this.config.memoryCleanupInterval);
    this.memoryCleanupTimer = true;
  }

  private performOptimization(): void {
    try {
      const metrics = this.collectMetrics();
      if (!metrics) return;
      
      // 记录性能历史
      this.performanceHistory.push(metrics);
      if (this.performanceHistory.length > 60) {
        this.performanceHistory.shift();
      }
      
      // 分析性能趋势
      const needsOptimization = this.analyzePerformance(metrics);
      
      if (needsOptimization) {
        this.applyOptimizations(metrics);
        this.lastOptimizationTime = Date.now();
      }
      
    } catch (error) {
      console.error('性能优化过程中发生错误:', error);
    }
  }

  private collectMetrics(): PerformanceMetrics | null {
    try {
      const animationEngine = (window as any).animationEngine;
      const layerManager = (window as any).layerManager;
      
      if (!animationEngine || !layerManager) {
        return null;
      }
      
      const animStats = animationEngine.getPerformanceStats?.() || {};
      const layerStats = layerManager.getPerformanceStats?.() || {};
      
      return {
        fps: animStats.currentFPS || 60,
        memoryUsage: this.estimateMemoryUsage(),
        renderTime: layerStats.renderTime || 0,
        visibleFeatures: layerStats.visibleFeatures || 0,
        culledFeatures: layerStats.culledFeatures || 0,
        activeAnimations: animStats.activeAnimations || 0,
        optimizationCount: 0,
        lastOptimization: this.lastOptimizationTime
      };
    } catch (error) {
      console.error('收集性能指标失败:', error);
      return null;
    }
  }

  private estimateMemoryUsage(): number {
    try {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      }
      
      // 估算内存使用
      const animationEngine = (window as any).animationEngine;
      const dataSimulator = (window as any).dataSimulator;
      const layerManager = (window as any).layerManager;
      
      let estimatedUsage = 20; // 基础使用量
      
      if (animationEngine?.getPerformanceStats) {
        const stats = animationEngine.getPerformanceStats();
        estimatedUsage += (stats.activeAnimations || 0) * 2;
      }
      
      if (dataSimulator?.getMemoryStats) {
        const stats = dataSimulator.getMemoryStats();
        estimatedUsage += stats.estimatedMemoryUsage || 0;
      }
      
      if (layerManager?.getPerformanceStats) {
        const stats = layerManager.getPerformanceStats();
        estimatedUsage += (stats.visibleFeatures || 0) * 0.01;
      }
      
      return Math.min(estimatedUsage, 100);
    } catch (error) {
      console.error('估算内存使用失败:', error);
      return 50;
    }
  }

  private analyzePerformance(metrics: PerformanceMetrics): boolean {
    // 检查是否需要优化
    const fpsLow = metrics.fps < this.thresholds.fps.warning;
    const memoryHigh = metrics.memoryUsage > this.thresholds.memory.warning;
    const renderTimeSlow = metrics.renderTime > this.thresholds.renderTime.warning;
    const tooManyFeatures = metrics.visibleFeatures > this.thresholds.features.maxVisible;
    
    // 避免频繁优化
    const timeSinceLastOptimization = Date.now() - this.lastOptimizationTime;
    const minOptimizationInterval = this.config.aggressiveMode ? 5000 : 10000;
    
    if (timeSinceLastOptimization < minOptimizationInterval) {
      return false;
    }
    
    return fpsLow || memoryHigh || renderTimeSlow || tooManyFeatures;
  }

  private applyOptimizations(metrics: PerformanceMetrics): void {
    console.log('应用性能优化...', metrics);
    
    try {
      const animationEngine = (window as any).animationEngine;
      const layerManager = (window as any).layerManager;
      
      // 优化动画引擎
      if (animationEngine) {
        if (metrics.fps < this.thresholds.fps.critical) {
          // 严重性能问题：降低帧率
          animationEngine.setTargetFPS?.(30);
          animationEngine.cleanupInactiveAnimations?.();
        } else if (metrics.fps < this.thresholds.fps.warning) {
          // 轻微性能问题：适度优化
          animationEngine.setTargetFPS?.(45);
        }
      }
      
      // 优化图层管理器
      if (layerManager) {
        if (metrics.visibleFeatures > this.thresholds.features.maxVisible) {
          // 减少可见要素
          layerManager.updateRenderOptimization?.({
            maxVisibleFeatures: Math.max(500, this.thresholds.features.maxVisible * 0.7),
            enableCulling: true,
            lodLevel: metrics.renderTime > this.thresholds.renderTime.critical ? 'low' : 'medium'
          });
        }
        
        if (metrics.renderTime > this.thresholds.renderTime.warning) {
          // 优化渲染性能
          layerManager.updateRenderOptimization?.({
            lodLevel: 'low',
            enableCulling: true,
            viewportBuffer: 0.1
          });
        }
      }
      
      // 内存优化
      if (metrics.memoryUsage > this.thresholds.memory.critical) {
        this.performMemoryCleanup(true);
      }
      
    } catch (error) {
      console.error('应用优化失败:', error);
    }
  }

  private performMemoryCleanup(force = false): void {
    try {
      const animationEngine = (window as any).animationEngine;
      const dataSimulator = (window as any).dataSimulator;
      const layerManager = (window as any).layerManager;
      
      if (animationEngine?.cleanupInactiveAnimations) {
        animationEngine.cleanupInactiveAnimations();
      }
      
      if (dataSimulator?.performMemoryCleanup) {
        dataSimulator.performMemoryCleanup();
      }
      
      if (layerManager?.cleanupMemoryStats) {
        layerManager.cleanupMemoryStats();
      }
      
      // 强制垃圾回收（如果可用）
      if (force && (window as any).gc) {
        (window as any).gc();
      }
      
      console.log(`内存清理完成 ${force ? '(强制)' : ''}`);
    } catch (error) {
      console.error('内存清理失败:', error);
    }
  }

  public getPerformanceMetrics(): PerformanceMetrics | null {
    return this.collectMetrics();
  }

  public getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  public updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // 如果配置发生变化，重启优化循环
    if (this.isRunning && (
      oldConfig.optimizationInterval !== this.config.optimizationInterval ||
      oldConfig.enableAutoOptimization !== this.config.enableAutoOptimization
    )) {
      this.stop();
      this.start();
    }
  }

  public forceOptimization(): void {
    const metrics = this.collectMetrics();
    if (metrics) {
      this.applyOptimizations(metrics);
      this.lastOptimizationTime = Date.now();
    }
  }

  public forceMemoryCleanup(): void {
    this.performMemoryCleanup(true);
  }

  public getStatus(): {
    isRunning: boolean;
    config: OptimizationConfig;
    thresholds: PerformanceThresholds;
    lastOptimization: number;
    historyLength: number;
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      thresholds: { ...this.thresholds },
      lastOptimization: this.lastOptimizationTime,
      historyLength: this.performanceHistory.length
    };
  }

  public destroy(): void {
    this.stop();
    this.performanceHistory = [];
    
    if ((window as any).performanceOptimizer === this) {
      delete (window as any).performanceOptimizer;
    }
  }
}

// 创建全局实例
export const globalPerformanceOptimizer = PerformanceOptimizer.getInstance();

// 自动启动
if (typeof window !== 'undefined') {
  // 延迟启动，确保其他组件已初始化
  setTimeout(() => {
    globalPerformanceOptimizer.start();
  }, 1000);
}