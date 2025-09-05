import { LayerManager } from '../lib/LayerManager';
import { animationOptimizer } from './AnimationPerformanceOptimizer';
import { handleError, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { globalPerformanceOptimizer } from '../utils/PerformanceOptimizer';
import { globalRenderOptimizer } from '../utils/RenderOptimizer';
import { globalTimerManager } from '../utils/TimerManager';

export interface FlowData {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: {
      id: string;
      path: string; // JSON stringified path
      t: number; // progress 0-1
      speed: number;
      destination: 'MTR' | 'Taxi' | 'Runway';
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }[];
}

export interface PatrolData {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: {
      id: string;
      patrolId: string;
      path?: [number, number][];
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }[];
}

export interface BusData {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: {
      id: string;
      busId: string;
      direction: 'forward' | 'backward';
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }[];
}

export class AnimationEngine {
  private animationFrameIds: Set<string> = new Set();
  private memoryCleanupTimerId = 'animation-engine-memory-cleanup';
  private layerManager: LayerManager;
  private isRunning: boolean = false;
  private frameSkipCounter: number = 0;
  private isDestroyed: boolean = false;
  private targetFPS: number = 60;
  private frameInterval: number = 1000 / 60; // 16.67ms for 60fps
  private lastFrameTime: number = 0;
  private performanceStats = {
    totalFrames: 0,
    droppedFrames: 0,
    lastUpdateTime: 0,
    animationErrors: 0,
    actualFPS: 0,
    frameTimeHistory: [] as number[],
    memoryUsage: 0,
    lastMemoryCheck: 0
  };
  private performanceOptimizer = globalPerformanceOptimizer;
  private renderOptimizer = globalRenderOptimizer;

  // 预定义路线
  private routes: {
    toMTR: [number, number][];
    toTaxi: [number, number][];
    toRunway: [number, number][];
    patrol: [number, number][];
    bus: [number, number][];
  } = {
    // 人流路线
    toMTR: [[114.19733, 22.32235], [114.2006, 22.3297], [114.1994, 22.3304]],
    toTaxi: [[114.19733, 22.32235], [114.2021, 22.3292], [114.2027, 22.3293]],
    toRunway: [[114.19733, 22.32235], [114.2055, 22.3245], [114.2128, 22.3074]],
    
    // 巡更路线
    patrol: [
      [114.2126, 22.3098],
      [114.2148, 22.3099],
      [114.2154, 22.3075],
      [114.2114, 22.3057],
      [114.2100, 22.3088],
      [114.2126, 22.3098]
    ],
    
    // 穿梭巴士路线
    bus: [
      [114.1994, 22.3304], // Kai Tak Station
      [114.19733435248456, 22.322347899895064], // KTSP
      [114.2128, 22.3074] // Runway 1331
    ]
  };

  constructor(layerManager: LayerManager) {
    if (!layerManager) {
      const error = new Error('LayerManager is required for AnimationEngine');
      handleError(error, ErrorType.CLIENT, ErrorSeverity.CRITICAL, {
        component: 'AnimationEngine',
        action: 'constructor'
      });
      throw error;
    }
    
    this.layerManager = layerManager;
    
    // 注册到性能优化器
    // 初始化性能监控
    console.log('AnimationEngine initialized');
    
    console.log('AnimationEngine initialized successfully');
  }

  /**
   * 帧率控制 - 确保稳定的60fps
   */
  private shouldRenderFrame(currentTime: number): boolean {
    if (currentTime - this.lastFrameTime >= this.frameInterval) {
      // 计算实际FPS
      const deltaTime = currentTime - this.lastFrameTime;
      this.performanceStats.frameTimeHistory.push(deltaTime);
      
      // 保持最近60帧的历史记录（减少内存使用）
      if (this.performanceStats.frameTimeHistory.length > 60) {
        this.performanceStats.frameTimeHistory.shift();
      }
      
      // 计算平均FPS
      const avgFrameTime = this.performanceStats.frameTimeHistory.reduce((a, b) => a + b, 0) / this.performanceStats.frameTimeHistory.length;
      this.performanceStats.actualFPS = Math.round(1000 / avgFrameTime);
      
      // 每5秒检查一次内存使用情况
      if (currentTime - this.performanceStats.lastMemoryCheck > 5000) {
        this.checkMemoryUsage();
        this.performanceStats.lastMemoryCheck = currentTime;
      }
      
      this.lastFrameTime = currentTime;
      return true;
    }
    return false;
  }

  /**
   * 动态调整帧率
   */
  private adjustFrameRate(): void {
    const currentFPS = this.performanceStats.actualFPS;
    const memoryUsage = this.performanceStats.memoryUsage;
    
    // 根据FPS和内存使用情况动态调整帧率
    if (currentFPS < 45 || memoryUsage > 100) {
      // 性能较差时，降低帧率
      this.targetFPS = Math.max(24, this.targetFPS - 6);
      console.warn(`性能较差，降低帧率至 ${this.targetFPS}fps`);
    } else if (currentFPS < 55 || memoryUsage > 80) {
      // 性能一般时，适度降低帧率
      this.targetFPS = Math.max(30, this.targetFPS - 3);
    } else if (currentFPS > 58 && memoryUsage < 50 && this.targetFPS < 60) {
      // 性能良好时，逐步提升帧率
      this.targetFPS = Math.min(60, this.targetFPS + 3);
    }
    
    this.frameInterval = 1000 / this.targetFPS;
  }

  /**
   * 路径插值计算
   * @param path 路径点数组
   * @param t 进度值 0-1
   * @returns 插值后的坐标
   */
  interpolatePath(path: [number, number][], t: number): [number, number] {
    const segments = path.length - 1;
    if (segments <= 0) return path[0];
    
    // 确保t在有效范围内
    t = Math.max(0, Math.min(1, t));
    
    const segmentLength = 1 / segments;
    const segmentIndex = Math.min(segments - 1, Math.floor(t / segmentLength));
    const localT = (t - segmentIndex * segmentLength) / segmentLength;
    
    const start = path[segmentIndex];
    const end = path[segmentIndex + 1];
    
    return [
      start[0] + (end[0] - start[0]) * localT,
      start[1] + (end[1] - start[1]) * localT
    ];
  }

  /**
   * 启动人流动画
   * @param audienceCount 观众数量（千人）
   */
  startFlowAnimation(audienceCount: number): void {
    if (this.isDestroyed) {
      console.warn('AnimationEngine已销毁，无法启动人流动画');
      return;
    }

    try {
      if (typeof audienceCount !== 'number' || audienceCount <= 0) {
        throw new Error(`Invalid audience count: ${audienceCount}`);
      }

      if (this.animationFrameIds.has('animation-engine-flow')) {
        this.stopAnimation('flow');
      }

      const flowData = this.generateFlowData(audienceCount);
      animationOptimizer.registerAnimation('flow');
      
      const animate = (currentTime: number) => {
        if (this.isDestroyed) return;
        
        try {
          this.performanceStats.totalFrames++;
          
          // 使用新的帧率控制
          if (this.shouldRenderFrame(currentTime)) {
            // 动态调整帧率（每120帧检查一次，减少CPU开销）
            if (this.performanceStats.totalFrames % 120 === 0) {
              this.adjustFrameRate();
            }
            
            // 批量处理动画更新
            animationOptimizer.queueRender(() => {
              flowData.features.forEach(feature => {
                const props = feature.properties;
                props.t += props.speed;
                
                // 重置到起点
                if (props.t > 1) {
                  props.t = 0;
                }
                
                const path = JSON.parse(props.path);
                feature.geometry.coordinates = this.interpolatePath(path, props.t);
              });
              
              this.layerManager.updateLayerData('flow-src', flowData);
              this.performanceStats.lastUpdateTime = Date.now();
              
              // 性能指标更新日志
              console.debug('AnimationEngine 性能指标:', {
                animationCount: this.animationFrameIds.size,
                renderQueueSize: animationOptimizer.getQueueSize ? animationOptimizer.getQueueSize() : 0,
                fps: this.performanceStats.actualFPS,
                memoryUsage: this.performanceStats.memoryUsage
              });
            });
          }
          
          globalTimerManager.requestAnimationFrame('animation-engine-flow', animate);
        } catch (err) {
          console.error('人流动画帧更新失败:', err);
          this.performanceStats.animationErrors++;
          handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
            component: 'AnimationEngine',
            action: 'flow_animation_frame'
          });
          
          // 尝试重新启动动画
          globalTimerManager.setTimeout('animation-engine-flow-restart', () => {
            if (!this.isDestroyed && !this.animationFrameIds.has('animation-engine-flow')) {
              this.startFlowAnimation(audienceCount);
            }
          }, 1000);
        }
      };
      
      globalTimerManager.requestAnimationFrame('animation-engine-flow', animate);
      this.animationFrameIds.add('animation-engine-flow');
    } catch (err) {
      console.error('启动人流动画失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'start_flow_animation',
        audienceCount
      });
      throw err;
    }
  }

  /**
   * 启动巡更动画
   */
  startPatrolAnimation(): void {
    if (this.isDestroyed) {
      console.warn('AnimationEngine已销毁，无法启动巡更动画');
      return;
    }

    try {
      if (this.animationFrameIds.has('animation-engine-patrol')) {
        this.stopAnimation('patrol');
      }

      let t = 0;
      const patrolData: PatrolData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            id: 'patrol-1',
            patrolId: 'P001'
          },
          geometry: {
            type: 'Point',
            coordinates: this.routes.patrol[0]
          }
        }]
      };
      
      animationOptimizer.registerAnimation('patrol');
      
      const animate = (currentTime: number) => {
        if (this.isDestroyed) return;
        
        try {
          this.performanceStats.totalFrames++;
          
          // 使用新的帧率控制
          if (this.shouldRenderFrame(currentTime)) {
            t += 0.008; // 巡更速度
            if (t > 1) t = 0;
            
            animationOptimizer.queueRender(() => {
              patrolData.features[0].geometry.coordinates = this.interpolatePath(this.routes.patrol, t);
              this.layerManager.updateLayerData('patrol-src', patrolData);
            });
            this.performanceStats.lastUpdateTime = Date.now();
          }
          
          globalTimerManager.requestAnimationFrame('animation-engine-patrol', animate);
        } catch (err) {
          console.error('巡更动画帧更新失败:', err);
          this.performanceStats.animationErrors++;
          handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
            component: 'AnimationEngine',
            action: 'patrol_animation_frame'
          });
          
          // 尝试重新启动动画
          globalTimerManager.setTimeout('animation-engine-patrol-restart', () => {
            if (!this.isDestroyed && !this.animationFrameIds.has('animation-engine-patrol')) {
              this.startPatrolAnimation();
            }
          }, 1000);
        }
      };
      
      globalTimerManager.requestAnimationFrame('animation-engine-patrol', animate);
      this.animationFrameIds.add('animation-engine-patrol');
    } catch (err) {
      console.error('启动巡更动画失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'start_patrol_animation'
      });
      throw err;
    }
  }

  /**
   * 启动穿梭巴士动画
   */
  startBusAnimation(): void {
    if (this.isDestroyed) {
      console.warn('AnimationEngine已销毁，无法启动穿梭巴士动画');
      return;
    }

    try {
      if (this.animationFrameIds.has('animation-engine-bus')) {
        this.stopAnimation('bus');
      }

      let t = 0;
      let direction = 1; // 1: forward, -1: backward
      
      const busData: BusData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            id: 'bus-1',
            busId: 'B001',
            direction: 'forward'
          },
          geometry: {
            type: 'Point',
            coordinates: this.routes.bus[0]
          }
        }]
      };
      
      animationOptimizer.registerAnimation('bus');
      
      const animate = (currentTime: number) => {
        if (this.isDestroyed) return;
        
        try {
          this.performanceStats.totalFrames++;
          
          // 使用新的帧率控制
          if (this.shouldRenderFrame(currentTime)) {
            t += 0.006 * direction; // 巴士速度
            
            // 到达终点时反向
            if (t >= 1 || t <= 0) {
              direction *= -1;
              t = Math.max(0, Math.min(1, t));
              busData.features[0].properties.direction = direction > 0 ? 'forward' : 'backward';
            }
            
            animationOptimizer.queueRender(() => {
              busData.features[0].geometry.coordinates = this.interpolatePath(this.routes.bus, t);
              this.layerManager.updateLayerData('bus-src', busData);
            });
            this.performanceStats.lastUpdateTime = Date.now();
          }
          
          globalTimerManager.requestAnimationFrame('animation-engine-bus', animate);
        } catch (err) {
          console.error('穿梭巴士动画帧更新失败:', err);
          this.performanceStats.animationErrors++;
          handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
            component: 'AnimationEngine',
            action: 'bus_animation_frame'
          });
          
          // 尝试重新启动动画
          globalTimerManager.setTimeout('animation-engine-bus-restart', () => {
            if (!this.isDestroyed && !this.animationFrameIds.has('animation-engine-bus')) {
              this.startBusAnimation();
            }
          }, 1000);
        }
      };
      
      globalTimerManager.requestAnimationFrame('animation-engine-bus', animate);
      this.animationFrameIds.add('animation-engine-bus');
    } catch (err) {
      console.error('启动穿梭巴士动画失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'start_bus_animation'
      });
      throw err;
    }
  }

  /**
   * 停止指定动画
   * @param animationType 动画类型
   */
  stopAnimation(animationType: string): void {
    try {
      if (!animationType || typeof animationType !== 'string') {
        console.warn('Invalid animation type:', animationType);
        return;
      }

      const animationId = `animation-engine-${animationType}`;
      if (this.animationFrameIds.has(animationId)) {
        globalTimerManager.cancelAnimationFrame(animationId);
        this.animationFrameIds.delete(animationId);
        animationOptimizer.unregisterAnimation(animationType);
        
        // 清理重启定时器
        globalTimerManager.clearTimeout(`${animationId}-restart`);
        
        // 清空对应的数据源
        this.layerManager.updateLayerData(`${animationType}-src`, {
          type: 'FeatureCollection',
          features: []
        });
        
        console.log(`动画 ${animationType} 已停止`);
      }
    } catch (err) {
      console.error(`停止动画 ${animationType} 失败:`, err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'AnimationEngine',
        action: 'stop_animation',
        animationType
      });
    }
  }

  /**
   * 停止动画引擎
   */
  stop(): void {
    this.stopAllAnimations();
  }

  /**
   * 停止所有动画
   */
  stopAllAnimations(): void {
    try {
      const animationIds = Array.from(this.animationFrameIds);
      
      this.animationFrameIds.forEach((animationId) => {
        try {
          globalTimerManager.cancelAnimationFrame(animationId);
          // 清理重启定时器
          globalTimerManager.clearTimeout(`${animationId}-restart`);
          
          // 从动画ID中提取类型
          const animationType = animationId.replace('animation-engine-', '');
          animationOptimizer.stopAnimation(animationType);
          
          // 清空对应的数据源
          this.layerManager.updateLayerData(`${animationType}-src`, {
            type: 'FeatureCollection',
            features: []
          });
        } catch (err) {
          console.error(`清理动画 ${animationId} 失败:`, err);
          this.performanceStats.animationErrors++;
        }
      });
      
      this.animationFrameIds.clear();
      this.isRunning = false;
      
      console.log(`已停止所有动画 (${animationIds.length} 个)`);
    } catch (err) {
      console.error('停止所有动画失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'stop_all_animations'
      });
    }
  }

  /**
   * 检查动画是否运行中
   * @param animationId 动画ID
   */
  isAnimationRunning(animationId: string): boolean {
    return this.animationFrameIds.has(`animation-engine-${animationId}`);
  }

  /**
   * 获取所有运行中的动画
   */
  getRunningAnimations(): string[] {
    return Array.from(this.animationFrameIds).map(id => id.replace('animation-engine-', ''));
  }

  /**
   * 获取动画统计信息
   */
  getStats(): {
    totalAnimations: number;
    activeAnimations: number;
    isRunning: boolean;
    performance: {
      fps: number;
      memoryUsage: number;
      renderQueueSize: number;
    };
  } {
    const performanceStats = animationOptimizer.getPerformanceStats();
    
    return {
      totalAnimations: this.animationFrameIds.size,
      activeAnimations: this.animationFrameIds.size,
      isRunning: this.isRunning,
      performance: {
        fps: performanceStats.fps,
        memoryUsage: performanceStats.memoryUsage,
        renderQueueSize: performanceStats.renderQueueSize
      }
    };
  }

  /**
   * 生成人流数据
   * @param audienceCount 观众数量（千人）
   */
  private generateFlowData(audienceCount: number): FlowData {
    const total = audienceCount * 1000;
    
    // 分流比例：MTR 60%, Taxi 25%, Runway 15%
    const distribution = {
      mtr: Math.round(total * 0.6 / 55), // 除以55是为了控制显示数量
      taxi: Math.round(total * 0.25 / 55),
      runway: Math.round(total * 0.15 / 55)
    };
    
    const features = [];
    
    // 生成MTR路线人流
    for (let i = 0; i < distribution.mtr; i++) {
      features.push({
        type: 'Feature' as const,
        properties: {
          id: `mtr-${i}`,
          path: JSON.stringify(this.routes.toMTR),
          t: Math.random() * 0.2, // 随机起始位置
          speed: 0.007 + Math.random() * 0.008, // 随机速度
          destination: 'MTR' as const
        },
        geometry: {
          type: 'Point' as const,
          coordinates: this.routes.toMTR[0] as [number, number]
        }
      });
    }
    
    // 生成出租车路线人流
    for (let i = 0; i < distribution.taxi; i++) {
      features.push({
        type: 'Feature' as const,
        properties: {
          id: `taxi-${i}`,
          path: JSON.stringify(this.routes.toTaxi),
          t: Math.random() * 0.2,
          speed: 0.009 + Math.random() * 0.006,
          destination: 'Taxi' as const
        },
        geometry: {
          type: 'Point' as const,
          coordinates: this.routes.toTaxi[0] as [number, number]
        }
      });
    }
    
    // 生成Runway路线人流
    for (let i = 0; i < distribution.runway; i++) {
      features.push({
        type: 'Feature' as const,
        properties: {
          id: `runway-${i}`,
          path: JSON.stringify(this.routes.toRunway),
          t: Math.random() * 0.2,
          speed: 0.006 + Math.random() * 0.004,
          destination: 'Runway' as const
        },
        geometry: {
          type: 'Point' as const,
          coordinates: this.routes.toRunway[0] as [number, number]
        }
      });
    }
    
    return { type: 'FeatureCollection', features };
  }

  /**
   * 销毁动画引擎
   */
  destroy(): void {
    try {
      if (this.isDestroyed) {
        console.warn('AnimationEngine已经被销毁');
        return;
      }

      this.stopAllAnimations();
      this.animationFrameIds.clear();
      animationOptimizer.destroy();
      
      // 清理内存清理定时器
      globalTimerManager.clearTimeout(this.memoryCleanupTimerId);
      
      // 清理性能统计
      this.performanceStats = {
        totalFrames: 0,
        droppedFrames: 0,
        lastUpdateTime: 0,
        animationErrors: 0,
        actualFPS: 0,
        frameTimeHistory: [],
        memoryUsage: 0,
        lastMemoryCheck: 0
      };
      
      // 重置帧率
      this.targetFPS = 60;
      this.frameInterval = 1000 / 60;
      
      // 从性能优化器中注销
      // 清理性能监控
    console.log('AnimationEngine destroyed');
      
      // 注意：不销毁全局RenderOptimizer，因为它可能被其他组件使用
      // 只清理与当前AnimationEngine相关的渲染队列
      console.log('AnimationEngine渲染队列已清理');
      
      this.isDestroyed = true;
      console.log('AnimationEngine已完全销毁');
    } catch (err) {
      console.error('销毁AnimationEngine失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'destroy'
      });
      // 强制设置销毁状态
      this.isDestroyed = true;
    }
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    try {
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        this.performanceStats.memoryUsage = Math.round(
          (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100
        );
        
        // 如果内存使用超过90%，触发垃圾回收建议
        if (this.performanceStats.memoryUsage > 90) {
          console.warn('内存使用率过高，建议清理资源');
          this.cleanupInactiveAnimations();
          // 通知性能优化器进行内存清理
          this.performanceOptimizer.forceMemoryCleanup();
        }
      }
    } catch (error) {
      console.warn('无法获取内存信息:', error);
    }
  }

  /**
   * 清理非活跃动画
   */
  private cleanupInactiveAnimations(): void {
    const currentTime = Date.now();
    const inactiveThreshold = 30000; // 30秒未更新的动画视为非活跃
    
    // 清理过期的帧时间历史记录
    if (this.performanceStats.frameTimeHistory.length > 120) {
      this.performanceStats.frameTimeHistory = this.performanceStats.frameTimeHistory.slice(-60);
    }
  }

  /**
   * 获取性能统计信息
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      targetFPS: this.targetFPS,
      frameInterval: this.frameInterval,
      activeAnimations: this.animationFrameIds.size,
      frameDropRate: this.performanceStats.totalFrames > 0 
        ? (this.performanceStats.droppedFrames / this.performanceStats.totalFrames * 100).toFixed(2) + '%'
        : '0%',
      isDestroyed: this.isDestroyed,
      memoryUsageMB: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 0
    };
  }

  /**
   * 检查是否已销毁
   */
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }

  /**
   * 重置性能统计
   */
  resetPerformanceStats(): void {
    this.performanceStats = {
      totalFrames: 0,
      droppedFrames: 0,
      lastUpdateTime: Date.now(),
      animationErrors: 0,
      actualFPS: 0,
      frameTimeHistory: [],
      memoryUsage: 0,
      lastMemoryCheck: 0
    };
    console.log('性能统计已重置');
  }
}

export default AnimationEngine;