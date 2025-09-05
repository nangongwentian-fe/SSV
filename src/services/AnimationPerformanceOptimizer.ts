import { getPerformanceMonitor } from './PerformanceMonitor';
import { globalTimerManager } from '../utils/TimerManager';

/**
 * 动画性能优化器
 * 负责管理动画帧率、内存使用和渲染优化
 */
export class AnimationPerformanceOptimizer {
  private performanceMonitor = getPerformanceMonitor();
  private frameRate: number = 60;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private memoryUsage: number = 0;
  private activeAnimations: Set<string> = new Set();
  private animationPool: Map<string, any[]> = new Map();
  private renderQueue: Array<() => void> = [];
  private isOptimizationEnabled: boolean = true;
  private performanceMetrics = {
    fps: 60,
    frameTime: 0,
    memoryUsage: 0,
    activeAnimations: 0,
    droppedFrames: 0,
    cpuUsage: 0,
    lastOptimization: 0,
    optimizationCount: 0
  };

  constructor() {
    this.initializePerformanceMonitoring();
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    // 监控帧率
    this.startFPSMonitoring();
    
    // 监控内存使用
    this.startMemoryMonitoring();
    
    // 设置渲染优化
    this.setupRenderOptimization();
  }

  /**
   * 开始FPS监控
   */
  private startFPSMonitoring(): void {
    let frameTimeHistory: number[] = [];
    
    const measureFPS = (currentTime: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
        requestAnimationFrame(measureFPS);
        return;
      }

      const deltaTime = currentTime - this.lastFrameTime;
      const fps = 1000 / deltaTime;
      
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }

      // 记录帧时间历史
      frameTimeHistory.push(deltaTime);
      if (frameTimeHistory.length > 60) {
        frameTimeHistory.shift();
      }

      this.frameCount++;
      this.lastFrameTime = currentTime;
      
      // 每60帧向性能监控器报告一次FPS
      if (this.frameCount % 60 === 0) {
        const avgFPS = this.getCurrentFPS();
        this.performanceMonitor.recordCustomMetric('animationFPS', avgFPS);
        
        // 更新性能指标
        this.performanceMetrics.fps = Math.round(avgFPS);
        const avgFrameTime = frameTimeHistory.reduce((a, b) => a + b, 0) / frameTimeHistory.length;
        this.performanceMetrics.frameTime = avgFrameTime;
        
        // 检测掉帧
        const droppedFrames = frameTimeHistory.filter(time => time > 20).length; // 超过20ms的帧
        this.performanceMetrics.droppedFrames += droppedFrames;
        
        // 性能优化决策
        this.makeOptimizationDecision();
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * 开始内存监控
   */
  private startMemoryMonitoring(): void {
    globalTimerManager.setInterval('animation-memory-monitor', () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        this.performanceMetrics.memoryUsage = this.memoryUsage;
        
        // 向性能监控器报告内存使用情况
        this.performanceMonitor.recordCustomMetric('animationMemoryUsage', this.memoryUsage);
        
        // 计算内存使用率
        const memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        // 如果内存使用率超过80%，触发清理
        if (memoryUsagePercent > 80) {
          console.warn(`内存使用率过高: ${memoryUsagePercent.toFixed(1)}%`);
          this.cleanupAnimationPool();
        }
        
        // 如果内存使用超过150MB，强制清理
        if (this.memoryUsage > 150) {
          console.warn(`内存使用过高: ${this.memoryUsage.toFixed(1)}MB`);
          this.forceCleanup();
        }
      }
    }, 3000); // 每3秒检查一次
  }

  /**
   * 设置渲染优化
   */
  private setupRenderOptimization(): void {
    // 使用requestAnimationFrame批量处理渲染
    const processRenderQueue = () => {
      if (this.renderQueue.length > 0) {
        const batch = this.renderQueue.splice(0, 10); // 每帧最多处理10个渲染任务
        batch.forEach(renderFn => {
          try {
            renderFn();
          } catch (error) {
            console.warn('Render function error:', error);
          }
        });
      }
      requestAnimationFrame(processRenderQueue);
    };
    
    requestAnimationFrame(processRenderQueue);
  }

  /**
   * 获取渲染队列大小
   */
  getQueueSize(): number {
    return this.renderQueue.length;
  }

  /**
   * 性能优化决策
   */
  private makeOptimizationDecision(): void {
    const { fps, memoryUsage, droppedFrames } = this.performanceMetrics;
    const currentTime = Date.now();
    
    // 避免频繁优化
    if (currentTime - this.performanceMetrics.lastOptimization < 5000) {
      return;
    }
    
    // 性能较差时启用优化
    if (fps < 30 || memoryUsage > 100 || droppedFrames > 10) {
      this.enablePerformanceMode();
      this.performanceMetrics.lastOptimization = currentTime;
      this.performanceMetrics.optimizationCount++;
    }
    // 性能良好时可以放宽限制
    else if (fps > 55 && memoryUsage < 50 && droppedFrames < 2) {
      this.relaxPerformanceMode();
    }
  }

  /**
   * 启用性能模式
   */
  private enablePerformanceMode(): void {
    console.log('启用性能模式 - FPS:', this.performanceMetrics.fps, 'Memory:', this.performanceMetrics.memoryUsage.toFixed(1), 'MB');
    
    // 降低动画帧率
    this.frameRate = 30;
    
    // 减少同时运行的动画数量
    this.limitActiveAnimations(8);
    
    // 启用对象池
    this.enableObjectPooling();
    
    // 降低渲染质量
    this.setRenderOptimization({
      enableCulling: true,
      enableLOD: true,
      maxRenderDistance: 800
    });
  }

  /**
   * 放宽性能模式
   */
  private relaxPerformanceMode(): void {
    console.log('放宽性能限制 - 性能良好');
    
    // 增加活跃动画数量
    this.limitActiveAnimations(15);
    
    // 提高渲染质量
    this.setRenderOptimization({
      enableCulling: true,
      enableLOD: false,
      maxRenderDistance: 1500
    });
  }

  /**
   * 限制活跃动画数量
   */
  private limitActiveAnimations(maxAnimations: number): void {
    if (this.activeAnimations.size > maxAnimations) {
      const animationsArray = Array.from(this.activeAnimations);
      const toRemove = animationsArray.slice(maxAnimations);
      toRemove.forEach(animationId => {
        this.stopAnimation(animationId);
      });
    }
  }

  /**
   * 启用对象池
   */
  private enableObjectPooling(): void {
    // 为常用对象类型创建对象池
    const objectTypes = ['point', 'vector', 'transform', 'particle'];
    objectTypes.forEach(type => {
      if (!this.animationPool.has(type)) {
        this.animationPool.set(type, []);
      }
    });
  }

  /**
   * 清理动画池
   */
  private cleanupAnimationPool(): void {
    console.log('清理动画对象池');
    
    this.animationPool.forEach((pool, type) => {
      // 保留最近使用的对象，清理其余的
      if (pool.length > 50) {
        this.animationPool.set(type, pool.slice(-25));
      }
    });
    
    // 强制垃圾回收（如果可用）
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * 强制清理
   */
  private forceCleanup(): void {
    console.log('强制清理内存');
    
    // 清空动画池
    this.animationPool.clear();
    
    // 清空渲染队列
    this.renderQueue = [];
    
    // 停止部分动画
    const animationsArray = Array.from(this.activeAnimations);
    const toStop = animationsArray.slice(0, Math.floor(animationsArray.length / 2));
    toStop.forEach(id => this.stopAnimation(id));
    
    // 强制垃圾回收
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * 设置渲染优化
   */
  private setRenderOptimization(options: {
    enableCulling: boolean;
    enableLOD: boolean;
    maxRenderDistance: number;
  }): void {
    // 这里可以实现具体的渲染优化逻辑
    console.log('设置渲染优化:', options);
  }

  /**
   * 注册动画
   */
  public registerAnimation(animationId: string): void {
    this.activeAnimations.add(animationId);
  }

  /**
   * 停止动画
   */
  public stopAnimation(animationId: string): void {
    this.activeAnimations.delete(animationId);
  }

  /**
   * 注销动画
   */
  public unregisterAnimation(animationId: string): void {
    this.activeAnimations.delete(animationId);
  }

  /**
   * 从对象池获取对象
   */
  public getFromPool<T>(type: string, factory: () => T): T {
    const pool = this.animationPool.get(type);
    if (pool && pool.length > 0) {
      return pool.pop() as T;
    }
    return factory();
  }

  /**
   * 将对象返回到池中
   */
  public returnToPool(type: string, object: any): void {
    const pool = this.animationPool.get(type);
    if (pool && pool.length < 100) {
      // 重置对象状态
      if (typeof object.reset === 'function') {
        object.reset();
      }
      pool.push(object);
    }
  }

  /**
   * 添加渲染任务到队列
   */
  public queueRender(renderFn: () => void): void {
    this.renderQueue.push(renderFn);
  }

  /**
   * 获取当前FPS
   */
  public getCurrentFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  /**
   * 获取内存使用情况
   */
  public getMemoryUsage(): number {
    return this.memoryUsage;
  }

  /**
   * 获取活跃动画数量
   */
  public getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    fps: number;
    memoryUsage: number;
    activeAnimations: number;
    renderQueueSize: number;
  } {
    return {
      fps: this.getCurrentFPS(),
      memoryUsage: this.getMemoryUsage(),
      activeAnimations: this.getActiveAnimationCount(),
      renderQueueSize: this.renderQueue.length
    };
  }

  /**
   * 设置优化开关
   */
  public setOptimizationEnabled(enabled: boolean): void {
    this.isOptimizationEnabled = enabled;
  }

  /**
   * 重置性能统计
   */
  public resetStats(): void {
    this.fpsHistory = [];
    this.frameCount = 0;
    this.memoryUsage = 0;
  }

  /**
   * 销毁优化器
   */
  public destroy(): void {
    this.activeAnimations.clear();
    this.animationPool.clear();
    this.renderQueue = [];
    this.fpsHistory = [];
  }
}

// 单例实例
export const animationOptimizer = new AnimationPerformanceOptimizer();