/**
 * 全局性能管理器
 * 负责监控系统性能、管理定时器和内存清理
 */
export class PerformanceManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private performanceCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor() {
    this.startMonitoring();
  }

  /**
   * 开始性能监控
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 每30秒检查一次内存使用
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
    
    // 每10秒检查一次性能
    this.performanceCheckInterval = setInterval(() => {
      this.checkPerformance();
    }, 10000);
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // 监听页面卸载
    window.addEventListener('beforeunload', this.cleanup.bind(this));
  }

  /**
   * 停止性能监控
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
      this.performanceCheckInterval = null;
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.cleanup.bind(this));
  }

  /**
   * 注册定时器
   */
  public setTimeout(id: string, callback: () => void, delay: number): void {
    // 清理已存在的定时器
    this.clearTimeout(id);
    
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    
    this.timers.set(id, timer);
  }

  /**
   * 清除定时器
   */
  public clearTimeout(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * 注册间隔定时器
   */
  public setInterval(id: string, callback: () => void, interval: number): void {
    // 清理已存在的间隔定时器
    this.clearInterval(id);
    
    const timer = setInterval(callback, interval);
    this.intervals.set(id, timer);
  }

  /**
   * 清除间隔定时器
   */
  public clearInterval(id: string): void {
    const timer = this.intervals.get(id);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(id);
    }
  }

  /**
   * 注册动画帧
   */
  public requestAnimationFrame(id: string, callback: (currentTime: number) => void): void {
    // 清理已存在的动画帧
    this.cancelAnimationFrame(id);
    
    const frameId = requestAnimationFrame((currentTime: number) => {
      callback(currentTime);
      this.animationFrames.delete(id);
    });
    
    this.animationFrames.set(id, frameId);
  }

  /**
   * 取消动画帧
   */
  public cancelAnimationFrame(id: string): void {
    const frameId = this.animationFrames.get(id);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(id);
    }
  }

  /**
   * 检查内存使用
   */
  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      console.log(`内存使用: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
      
      // 如果内存使用超过80%，触发清理
      if (usedMB / limitMB > 0.8) {
        console.warn('内存使用过高，开始清理');
        this.forceGarbageCollection();
      }
    }
  }

  /**
   * 检查性能
   */
  private checkPerformance(): void {
    const timerCount = this.timers.size;
    const intervalCount = this.intervals.size;
    const frameCount = this.animationFrames.size;
    
    console.log(`性能统计 - 定时器: ${timerCount}, 间隔器: ${intervalCount}, 动画帧: ${frameCount}`);
    
    // 如果定时器过多，发出警告
    if (timerCount > 50 || intervalCount > 20 || frameCount > 100) {
      console.warn('定时器数量过多，可能影响性能');
    }
  }

  /**
   * 处理页面可见性变化
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // 页面隐藏时，暂停非关键定时器
      console.log('页面隐藏，暂停非关键定时器');
      this.pauseNonCriticalTimers();
    } else {
      // 页面显示时，恢复定时器
      console.log('页面显示，恢复定时器');
      this.resumeTimers();
    }
  }

  /**
   * 暂停非关键定时器
   */
  private pauseNonCriticalTimers(): void {
    // 这里可以根据需要暂停特定的定时器
    // 例如暂停动画相关的定时器
  }

  /**
   * 恢复定时器
   */
  private resumeTimers(): void {
    // 恢复被暂停的定时器
  }

  /**
   * 强制垃圾回收
   */
  private forceGarbageCollection(): void {
    // 清理过期的定时器
    this.cleanupExpiredTimers();
    
    // 如果浏览器支持，触发垃圾回收
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * 清理过期的定时器
   */
  private cleanupExpiredTimers(): void {
    // 清理所有已完成的定时器（这些应该已经被自动清理了）
    // 这里主要是作为安全措施
  }

  /**
   * 获取性能统计
   */
  public getStats(): {
    timers: number;
    intervals: number;
    animationFrames: number;
    memoryUsage?: number;
  } {
    const stats = {
      timers: this.timers.size,
      intervals: this.intervals.size,
      animationFrames: this.animationFrames.size
    };
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      (stats as any).memoryUsage = memory.usedJSHeapSize / 1024 / 1024;
    }
    
    return stats;
  }

  /**
   * 清理所有资源
   */
  public cleanup(): void {
    console.log('清理性能管理器资源');
    
    // 清理所有定时器
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    
    // 清理所有间隔定时器
    this.intervals.forEach((timer) => clearInterval(timer));
    this.intervals.clear();
    
    // 清理所有动画帧
    this.animationFrames.forEach((frameId) => cancelAnimationFrame(frameId));
    this.animationFrames.clear();
    
    // 停止监控
    this.stopMonitoring();
  }
}

// 单例实例
export const performanceManager = new PerformanceManager();