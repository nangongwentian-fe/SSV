import React from 'react';
import { globalPerformanceOptimizer } from './PerformanceOptimizer';
import { globalTimerManager } from './TimerManager';
import { globalMemoryLeakDetector, type LeakReport } from './MemoryLeakDetector';
import { dataSimulator } from '../services/DataSimulator';
import { useFeedbackStore } from '../stores/feedbackStore';
import { useRealtimeStore } from '../store/realtimeStore';
import { useMapStore } from '../store/mapStore';
import { useKPIStore } from '../store/kpiStore';
import { useSystemStore } from '../store/systemStore';
import { useAlertStore } from '../store/alertStore';
import { useDeviceStore } from '../store/deviceStore';
import { useParkingStore } from '../store/parkingStore';
import { useWeatherStore } from '../store/weatherStore';
import { useUIStore } from '../store/uiStore';
import { useSimulationStore } from '../store/simulationStore';

/**
 * 全局资源管理器
 * 负责统一管理应用中所有组件的资源清理
 */
class ResourceManager {
  private static instance: ResourceManager;
  private cleanupCallbacks: Map<string, () => void> = new Map();
  private isDestroying = false;
  private componentHistory: Array<{id: string, name?: string, mountTime: number, cleanup: () => void}> = [];
  private leakReports: LeakReport[] = [];

  private constructor() {
    // 监听页面卸载事件
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
      window.addEventListener('unload', this.handleUnload.bind(this));
      
      // 监听页面可见性变化
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    // 启动内存泄漏检测
    this.initializeLeakDetection();
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * 注册组件的清理回调
   */
  registerCleanup(componentId: string, cleanupCallback: () => void, name?: string): void {
    if (this.isDestroying) {
      console.warn(`ResourceManager正在销毁，无法注册组件: ${componentId}`);
      return;
    }
    
    this.cleanupCallbacks.set(componentId, cleanupCallback);
    console.log(`已注册组件清理回调: ${componentId}`);
    
    // 在开发环境下记录组件注册
    if (process.env.NODE_ENV === 'development') {
      console.debug(`组件注册: ${name || componentId}`);
    }
  }

  /**
   * 注销组件的清理回调
   */
  unregisterCleanup(componentId: string): void {
    if (this.cleanupCallbacks.has(componentId)) {
      const cleanupCallback = this.cleanupCallbacks.get(componentId);
      if (cleanupCallback) {
        // 记录组件生命周期
        const component = {
          id: componentId,
          mountTime: Date.now(),
          cleanup: cleanupCallback
        };
        this.componentHistory.push(component);

        // 保持历史记录数量限制
        if (this.componentHistory.length > 100) {
          this.componentHistory.shift();
        }
      }
      
      this.cleanupCallbacks.delete(componentId);
      console.log(`已注销组件清理回调: ${componentId}`);
      
      // 在开发环境下记录组件注销
      if (process.env.NODE_ENV === 'development') {
        console.debug(`组件注销: ${componentId}`);
      }
    }
  }

  /**
   * 执行特定组件的清理
   */
  cleanupComponent(componentId: string): void {
    const cleanupCallback = this.cleanupCallbacks.get(componentId);
    if (cleanupCallback) {
      try {
        cleanupCallback();
        console.log(`组件 ${componentId} 清理完成`);
      } catch (error) {
        console.error(`组件 ${componentId} 清理失败:`, error);
      }
    }
  }

  /**
   * 执行所有组件的清理
   */
  cleanupAll(): void {
    if (this.isDestroying) {
      console.warn('ResourceManager已在销毁过程中');
      return;
    }

    this.isDestroying = true;
    console.log('开始执行全局资源清理...');
    const startTime = Date.now();
    let cleanedCount = 0;

    // 清理所有注册的组件
    const componentIds = Array.from(this.cleanupCallbacks.keys());
    componentIds.forEach(componentId => {
      this.cleanupComponent(componentId);
      cleanedCount++;
    });

    // 清理核心服务
    this.cleanupCoreServices();

    // 清理Store
    this.cleanupStores();

    // 清理所有定时器
    globalTimerManager.cleanup();

    // 清理全局事件监听器
    this.cleanupGlobalListeners();

    // 注意：定时器已通过globalTimerManager.cleanup()清理

    // 停止内存泄漏检测
    globalMemoryLeakDetector.stop();

    // 强制垃圾回收
    this.forceGarbageCollection();

    const cleanupTime = Date.now() - startTime;
    console.log(`全局资源清理完成，清理了 ${cleanedCount} 个资源，耗时 ${cleanupTime}ms`);
  }

  /**
   * 清理核心服务
   */
  private cleanupCoreServices(): void {
    try {
      // 清理数据模拟器
      if (dataSimulator) {
        dataSimulator.destroy();
      }

      // 清理性能优化器
      if (globalPerformanceOptimizer) {
        globalPerformanceOptimizer.stop();
      }

      console.log('核心服务清理完成');
    } catch (error) {
      console.error('核心服务清理失败:', error);
    }
  }

  /**
   * 清理Store
   */
  private cleanupStores(): void {
    try {
      // 清理RealtimeStore
      const realtimeStore = useRealtimeStore.getState();
      if (realtimeStore.cleanup) {
        realtimeStore.cleanup();
      }
      
      // 清理MapStore - 只有MapStore有destroy方法
      try {
        const mapStore = useMapStore.getState();
        if (mapStore.destroy) {
          mapStore.destroy();
        }
      } catch (error) {
        console.warn('Map Store清理失败:', error);
      }
      
      // 其他Store没有destroy方法，跳过清理
      try {
        console.log('KPI Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('KPI Store清理失败:', error);
      }
      
      try {
        console.log('System Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('System Store清理失败:', error);
      }
      
      try {
        console.log('Alert Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('Alert Store清理失败:', error);
      }
      
      try {
        console.log('Device Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('Device Store清理失败:', error);
      }
      
      try {
        console.log('Parking Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('Parking Store清理失败:', error);
      }
      
      try {
        console.log('Feedback Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('Feedback Store清理失败:', error);
      }
      
      try {
        // WeatherStore没有destroy方法，跳过清理
        console.log('Weather Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('Weather Store清理失败:', error);
      }
      
      try {
        // UIStore没有destroy方法，跳过清理
        console.log('UI Store已跳过清理（无destroy方法）');
      } catch (error) {
        console.warn('UI Store清理失败:', error);
      }
      
      try {
        const simulationStore = useSimulationStore.getState();
        // SimulationStore有stopSimulation方法，调用它来停止模拟
        if (simulationStore.stopSimulation) {
          simulationStore.stopSimulation();
        }
      } catch (error) {
        console.warn('Simulation Store清理失败:', error);
      }

      console.log('Store清理完成');
    } catch (error) {
      console.error('Store清理失败:', error);
    }
  }

  /**
   * 清理全局事件监听器
   */
  private cleanupGlobalListeners(): void {
    try {
      if (typeof window !== 'undefined') {
        // 移除页面卸载监听器
        window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.removeEventListener('unload', this.handleUnload.bind(this));
        
        // 移除页面可见性监听器
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      }

      console.log('全局事件监听器清理完成');
    } catch (error) {
      console.error('全局事件监听器清理失败:', error);
    }
  }

  /**
   * 清理定时器（已废弃）
   * 现在所有定时器都通过globalTimerManager统一管理
   */
  private cleanupTimers(): void {
    // 此方法已废弃，定时器清理由globalTimerManager.cleanup()处理
    console.log('定时器清理由globalTimerManager处理');
  }

  /**
   * 强制垃圾回收
   */
  private forceGarbageCollection(): void {
    try {
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
        console.log('已触发垃圾回收');
      } else {
        console.log('垃圾回收不可用');
      }
    } catch (error) {
      console.error('垃圾回收失败:', error);
    }
  }

  /**
   * 页面卸载前处理
   */
  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    console.log('页面即将卸载，开始清理资源...');
    this.cleanupAll();
  }

  /**
   * 页面卸载处理
   */
  private handleUnload(event: Event): void {
    console.log('页面已卸载');
  }

  /**
   * 页面可见性变化处理
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      console.log('页面隐藏，执行内存清理...');
      // 页面隐藏时执行轻量级清理
      if (globalPerformanceOptimizer) {
        globalPerformanceOptimizer.forceMemoryCleanup();
      }
    } else {
      console.log('页面显示，恢复正常运行');
    }
  }

  /**
   * 获取当前注册的组件数量
   */
  getRegisteredComponentsCount(): number {
    return this.cleanupCallbacks.size;
  }

  /**
   * 获取所有注册的组件ID
   */
  getRegisteredComponentIds(): string[] {
    return Array.from(this.cleanupCallbacks.keys());
  }

  /**
   * 检查是否正在销毁
   */
  getIsDestroying(): boolean {
    return this.isDestroying;
  }

  /**
   * 获取资源使用统计
   */
  getResourceStats(): {
    registeredCallbacks: number;
    timerStats: any;
    memoryUsage?: number;
    performanceStats?: any;
    leakDetection: {
      isRunning: boolean;
      reportCount: number;
      lastCheck?: number;
    };
    componentStats: {
      [componentName: string]: {
        count: number;
        avgLifetime: number;
        totalMountTime: number;
      };
    };
  } {
    const leakDetectionStatus = globalMemoryLeakDetector.getStatus();
    
    // 计算组件统计
    const componentStats: { [key: string]: { count: number; avgLifetime: number; totalMountTime: number } } = {};
    
    // 统计历史组件
    this.componentHistory.forEach(component => {
      const name = component.name || 'unknown';
      if (!componentStats[name]) {
        componentStats[name] = { count: 0, avgLifetime: 0, totalMountTime: 0 };
      }
      componentStats[name].count++;
      componentStats[name].totalMountTime += component.mountTime;
    });
    
    // 计算平均生命周期
    Object.keys(componentStats).forEach(name => {
      const stats = componentStats[name];
      stats.avgLifetime = stats.totalMountTime / stats.count;
    });
    
    const stats = {
      registeredCallbacks: this.cleanupCallbacks.size,
      timerStats: globalTimerManager.getStats(),
      performanceStats: globalPerformanceOptimizer.getPerformanceMetrics() || {
        fps: 60,
        memoryUsage: 50,
        renderTime: 0,
        visibleFeatures: 0,
        culledFeatures: 0,
        activeAnimations: 0,
        optimizationCount: 0,
        lastOptimization: 0
      },
      leakDetection: {
        isRunning: leakDetectionStatus.isRunning,
        reportCount: leakDetectionStatus.reportCount,
        lastCheck: leakDetectionStatus.lastCheck
      },
      componentStats
    };
    
    // 尝试获取内存使用情况
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      (stats as any).memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    
    return stats;
  }
  /**
   * 初始化内存泄漏检测
   */
  private initializeLeakDetection(): void {
    // 设置泄漏报告回调
    globalMemoryLeakDetector.start({
      enabled: true,
      checkInterval: 30000, // 30秒检测一次
      autoCleanup: false, // 不自动清理，由用户决定
      reportCallback: (report) => {
        this.leakReports.push(report);
        
        // 保持报告数量限制
        if (this.leakReports.length > 20) {
          this.leakReports.shift();
        }
        
        // 在开发环境下输出详细信息
        if (process.env.NODE_ENV === 'development') {
          console.warn('[内存泄漏检测]', report);
        }
      }
    });
  }

  /**
   * 获取内存泄漏报告
   */
  getLeakReports(): LeakReport[] {
    return [...this.leakReports];
  }

  /**
   * 获取组件历史统计
   */
  getComponentHistory(): Array<{id: string, name?: string, mountTime: number, cleanup: () => void}> {
    return [...this.componentHistory];
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.componentHistory.length = 0;
    this.leakReports.length = 0;
    globalMemoryLeakDetector.clearHistory();
    console.log('已清除资源管理历史数据');
  }
}

// 导出单例实例
export const globalResourceManager = ResourceManager.getInstance();

// 导出Hook用于React组件
export function useResourceCleanup(componentId: string, cleanupCallback: () => void) {
  React.useEffect(() => {
    globalResourceManager.registerCleanup(componentId, cleanupCallback);
    
    return () => {
      globalResourceManager.unregisterCleanup(componentId);
    };
  }, [componentId]);
}