/**
 * 定时器管理器
 * 统一管理应用中所有定时器，防止内存泄漏
 */
class TimerManager {
  private static instance: TimerManager;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private isDestroyed = false;

  private constructor() {
    // 监听页面卸载事件
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.cleanup.bind(this));
      window.addEventListener('pagehide', this.cleanup.bind(this));
    }
  }

  static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * 设置定时器
   */
  setTimeout(id: string, callback: () => void, delay: number): void {
    if (this.isDestroyed) {
      console.warn('TimerManager已销毁，无法设置定时器');
      return;
    }

    // 清理已存在的定时器
    this.clearTimeout(id);

    const timer = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error(`定时器 ${id} 执行失败:`, error);
      } finally {
        // 自动清理已完成的定时器
        this.timers.delete(id);
      }
    }, delay);

    this.timers.set(id, timer);
  }

  /**
   * 设置间隔定时器
   */
  setInterval(id: string, callback: () => void, interval: number): void {
    if (this.isDestroyed) {
      console.warn('TimerManager已销毁，无法设置间隔定时器');
      return;
    }

    // 清理已存在的间隔定时器
    this.clearInterval(id);

    const timer = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(`间隔定时器 ${id} 执行失败:`, error);
        // 发生错误时清理定时器
        this.clearInterval(id);
      }
    }, interval);

    this.intervals.set(id, timer);
  }

  /**
   * 请求动画帧
   */
  requestAnimationFrame(id: string, callback: (currentTime: number) => void): void {
    if (this.isDestroyed) {
      console.warn('TimerManager已销毁，无法请求动画帧');
      return;
    }

    // 清理已存在的动画帧
    this.cancelAnimationFrame(id);

    const frameId = requestAnimationFrame((currentTime: number) => {
      try {
        callback(currentTime);
      } catch (error) {
        console.error(`动画帧 ${id} 执行失败:`, error);
      } finally {
        // 自动清理已完成的动画帧
        this.animationFrames.delete(id);
      }
    });

    this.animationFrames.set(id, frameId);
  }

  /**
   * 清除定时器
   */
  clearTimeout(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * 清除间隔定时器
   */
  clearInterval(id: string): void {
    const timer = this.intervals.get(id);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(id);
    }
  }

  /**
   * 取消动画帧
   */
  cancelAnimationFrame(id: string): void {
    const frameId = this.animationFrames.get(id);
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(id);
    }
  }

  /**
   * 清除特定前缀的所有定时器
   */
  clearByPrefix(prefix: string): void {
    // 清除定时器
    for (const [id, timer] of this.timers.entries()) {
      if (id.startsWith(prefix)) {
        clearTimeout(timer);
        this.timers.delete(id);
      }
    }

    // 清除间隔定时器
    for (const [id, timer] of this.intervals.entries()) {
      if (id.startsWith(prefix)) {
        clearInterval(timer);
        this.intervals.delete(id);
      }
    }

    // 清除动画帧
    for (const [id, frameId] of this.animationFrames.entries()) {
      if (id.startsWith(prefix)) {
        cancelAnimationFrame(frameId);
        this.animationFrames.delete(id);
      }
    }
  }

  /**
   * 获取活跃定时器统计
   */
  getStats(): {
    timeouts: number;
    intervals: number;
    animationFrames: number;
    total: number;
    activeTimers: string[];
  } {
    const timeouts = this.timers.size;
    const intervals = this.intervals.size;
    const animationFrames = this.animationFrames.size;
    
    return {
      timeouts,
      intervals,
      animationFrames,
      total: timeouts + intervals + animationFrames,
      activeTimers: [
        ...Array.from(this.timers.keys()).map(id => `timeout:${id}`),
        ...Array.from(this.intervals.keys()).map(id => `interval:${id}`),
        ...Array.from(this.animationFrames.keys()).map(id => `frame:${id}`)
      ]
    };
  }

  /**
   * 检查是否有活跃的定时器
   */
  hasActiveTimers(): boolean {
    return this.timers.size > 0 || this.intervals.size > 0 || this.animationFrames.size > 0;
  }

  /**
   * 清理过期的定时器
   */
  cleanupStaleTimers(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5分钟
    
    // 这里可以添加更复杂的逻辑来识别过期定时器
    // 目前简单地清理一些可能的泄漏定时器
    const suspiciousPatterns = ['temp-', 'cache-', 'old-', 'unused-'];
    
    let cleanedCount = 0;
    
    // 清理可疑的定时器
    for (const [id] of this.timers.entries()) {
      if (suspiciousPatterns.some(pattern => id.includes(pattern))) {
        this.clearTimeout(id);
        cleanedCount++;
      }
    }
    
    for (const [id] of this.intervals.entries()) {
      if (suspiciousPatterns.some(pattern => id.includes(pattern))) {
        this.clearInterval(id);
        cleanedCount++;
      }
    }
    
    for (const [id] of this.animationFrames.entries()) {
      if (suspiciousPatterns.some(pattern => id.includes(pattern))) {
        this.cancelAnimationFrame(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个可疑的定时器`);
    }
  }
  
  /**
   * 执行内存清理
   */
  performMemoryCleanup(): void {
    const stats = this.getStats();
    
    // 如果定时器数量过多，进行清理
    if (stats.total > 50) {
      console.warn(`定时器数量过多 (${stats.total})，开始清理...`);
      
      // 清理过期定时器
      this.cleanupStaleTimers();
      
      // 如果仍然过多，清理一些非关键定时器
      if (this.getStats().total > 30) {
        const nonCriticalPatterns = ['animation-', 'ui-', 'effect-', 'transition-'];
        
        for (const [id] of this.intervals.entries()) {
          if (nonCriticalPatterns.some(pattern => id.includes(pattern))) {
            this.clearInterval(id);
          }
        }
        
        for (const [id] of this.animationFrames.entries()) {
          if (nonCriticalPatterns.some(pattern => id.includes(pattern))) {
            this.cancelAnimationFrame(id);
          }
        }
      }
      
      const newStats = this.getStats();
      console.log(`内存清理完成，定时器数量从 ${stats.total} 减少到 ${newStats.total}`);
    }
  }

  /**
   * 清理所有定时器
   */
  cleanup(): void {
    if (this.isDestroyed) {
      return;
    }

    console.log('开始清理所有定时器...');
    
    // 清理所有定时器
    this.timers.forEach((timer, id) => {
      clearTimeout(timer);
      console.log(`清理定时器: ${id}`);
    });
    this.timers.clear();

    // 清理所有间隔定时器
    this.intervals.forEach((timer, id) => {
      clearInterval(timer);
      console.log(`清理间隔定时器: ${id}`);
    });
    this.intervals.clear();

    // 清理所有动画帧
    this.animationFrames.forEach((frameId, id) => {
      cancelAnimationFrame(frameId);
      console.log(`清理动画帧: ${id}`);
    });
    this.animationFrames.clear();

    this.isDestroyed = true;
    console.log('所有定时器已清理完成');
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.cleanup();
    
    // 移除事件监听器
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.cleanup.bind(this));
      window.removeEventListener('pagehide', this.cleanup.bind(this));
    }
  }
}

// 导出单例实例
export const globalTimerManager = TimerManager.getInstance();

// 导出便捷的Hook用于React组件
export const useTimerManager = () => {
  return {
    setTimeout: globalTimerManager.setTimeout.bind(globalTimerManager),
    setInterval: globalTimerManager.setInterval.bind(globalTimerManager),
    requestAnimationFrame: globalTimerManager.requestAnimationFrame.bind(globalTimerManager),
    clearTimeout: globalTimerManager.clearTimeout.bind(globalTimerManager),
    clearInterval: globalTimerManager.clearInterval.bind(globalTimerManager),
    cancelAnimationFrame: globalTimerManager.cancelAnimationFrame.bind(globalTimerManager),
    clearByPrefix: globalTimerManager.clearByPrefix.bind(globalTimerManager),
    getStats: globalTimerManager.getStats.bind(globalTimerManager)
  };
};

export default TimerManager;