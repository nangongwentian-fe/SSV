import { globalPerformanceOptimizer } from './PerformanceOptimizer';
import { handleError, ErrorType, ErrorSeverity } from './errorHandler';

/**
 * 渲染优化器 - 专门处理大数据量渲染优化
 */
export class RenderOptimizer {
  private isDestroyed = false;
  private renderQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  private frameId?: number;
  
  // LOD配置
  private lodConfig = {
    levels: {
      ultra: { zoom: 18, maxFeatures: 2000, quality: 1.0 },
      high: { zoom: 16, maxFeatures: 1000, quality: 0.9 },
      medium: { zoom: 14, maxFeatures: 500, quality: 0.7 },
      low: { zoom: 12, maxFeatures: 200, quality: 0.5 },
      minimal: { zoom: 0, maxFeatures: 50, quality: 0.3 }
    },
    adaptiveThresholds: {
      fpsThreshold: 30, // FPS低于此值时降级
      memoryThreshold: 100 * 1024 * 1024, // 100MB内存阈值
      renderTimeThreshold: 16 // 16ms渲染时间阈值
    }
  };
  
  // 视口裁剪配置
  private cullingConfig = {
    enabled: true,
    bufferRatio: 0.3, // 视口缓冲区比例
    updateInterval: 100, // 更新间隔(ms)
    lastUpdateTime: 0,
    spatialIndex: new Map<string, any[]>() // 空间索引
  };
  
  // 性能统计
  private stats = {
    totalFeatures: 0,
    visibleFeatures: 0,
    culledFeatures: 0,
    renderTime: 0,
    lodLevel: 'medium' as keyof typeof this.lodConfig.levels,
    adaptiveAdjustments: 0,
    lastFrameTime: 0,
    frameCount: 0,
    totalRenderTime: 0,
    fpsHistory: [] as number[],
    renderTimeHistory: [] as number[]
  };
  
  // 自适应渲染状态
  private adaptiveState = {
    consecutiveLowFPS: 0,
    consecutiveHighMemory: 0,
    lastLODAdjustment: 0,
    isAdaptiveMode: true,
    adaptiveAdjustments: 0
  };

  constructor() {
    this.startRenderLoop();
    // 初始化性能监控
    console.log('RenderOptimizer initialized');
  }

  /**
   * 启动渲染循环
   */
  private startRenderLoop(): void {
    const processFrame = (timestamp: number) => {
      if (this.isDestroyed) return;
      
      const deltaTime = timestamp - this.stats.lastFrameTime;
      this.stats.lastFrameTime = timestamp;
      
      // 处理渲染队列
      this.processRenderQueue();
      
      // 自适应性能调整
      if (this.adaptiveState.isAdaptiveMode) {
        this.performAdaptiveOptimization(deltaTime);
      }
      
      this.frameId = requestAnimationFrame(processFrame);
    };
    
    this.frameId = requestAnimationFrame(processFrame);
  }

  /**
   * 处理渲染队列
   */
  private processRenderQueue(): void {
    if (this.isProcessingQueue || this.renderQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    const startTime = performance.now();
    
    try {
      // 批量处理渲染任务，限制每帧处理时间
      const maxProcessTime = 8; // 8ms
      
      while (this.renderQueue.length > 0 && (performance.now() - startTime) < maxProcessTime) {
        const task = this.renderQueue.shift();
        if (task) {
          task();
        }
      }
      
      const renderTime = performance.now() - startTime;
      this.stats.renderTime = renderTime;
      
      // 更新性能历史记录
      this.updatePerformanceHistory(renderTime);
    } catch (err) {
      console.error('渲染队列处理失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'RenderOptimizer',
        action: 'process_render_queue'
      });
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  /**
   * 更新性能历史记录
   */
  private updatePerformanceHistory(renderTime: number): void {
    this.stats.frameCount++;
    this.stats.totalRenderTime += renderTime;
    
    // 计算FPS
    const currentTime = performance.now();
    if (this.stats.lastFrameTime > 0) {
      const deltaTime = currentTime - this.stats.lastFrameTime;
      const fps = 1000 / deltaTime;
      
      this.stats.fpsHistory.push(fps);
      if (this.stats.fpsHistory.length > 60) { // 保留最近60帧
        this.stats.fpsHistory.shift();
      }
    }
    
    // 记录渲染时间
    this.stats.renderTimeHistory.push(renderTime);
    if (this.stats.renderTimeHistory.length > 60) { // 保留最近60帧
      this.stats.renderTimeHistory.shift();
    }
  }

  /**
   * 添加渲染任务到队列
   */
  queueRender(task: () => void, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    if (this.isDestroyed) return;
    
    if (priority === 'high') {
      this.renderQueue.unshift(task);
    } else {
      this.renderQueue.push(task);
    }
  }

  /**
   * 执行自适应性能优化
   */
  private performAdaptiveOptimization(deltaTime: number): void {
    const now = Date.now();
    if (now - this.adaptiveState.lastLODAdjustment < 1000) {
      return; // 限制调整频率
    }
    
    const performanceStats = globalPerformanceOptimizer.getPerformanceMetrics() || {
      fps: 60,
      memoryUsage: 50,
      renderTime: 0,
      visibleFeatures: 0,
      culledFeatures: 0,
      activeAnimations: 0,
      optimizationCount: 0,
      lastOptimization: 0
    };
    const currentFPS = 1000 / deltaTime;
    
    // 检查性能指标
    const needsOptimization = this.checkPerformanceThresholds(currentFPS, performanceStats);
    
    if (needsOptimization.shouldDowngrade) {
      this.downgradeLOD();
      this.adaptiveState.lastLODAdjustment = now;
      this.adaptiveState.adaptiveAdjustments++;
    } else if (needsOptimization.canUpgrade) {
      this.upgradeLOD();
      this.adaptiveState.lastLODAdjustment = now;
      this.adaptiveState.adaptiveAdjustments++;
    }
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(currentFPS: number, performanceStats: any): {
    shouldDowngrade: boolean;
    canUpgrade: boolean;
  } {
    const { fpsThreshold, memoryThreshold, renderTimeThreshold } = this.lodConfig.adaptiveThresholds;
    
    // 检查是否需要降级
    const lowFPS = currentFPS < fpsThreshold;
    const highMemory = performanceStats.memoryUsage > memoryThreshold;
    const slowRender = this.stats.renderTime > renderTimeThreshold;
    
    if (lowFPS) {
      this.adaptiveState.consecutiveLowFPS++;
    } else {
      this.adaptiveState.consecutiveLowFPS = 0;
    }
    
    if (highMemory) {
      this.adaptiveState.consecutiveHighMemory++;
    } else {
      this.adaptiveState.consecutiveHighMemory = 0;
    }
    
    const shouldDowngrade = (
      this.adaptiveState.consecutiveLowFPS >= 3 ||
      this.adaptiveState.consecutiveHighMemory >= 3 ||
      slowRender
    ) && this.stats.lodLevel !== 'minimal';
    
    const canUpgrade = (
      currentFPS > fpsThreshold * 1.2 &&
      performanceStats.memoryUsage < memoryThreshold * 0.8 &&
      this.stats.renderTime < renderTimeThreshold * 0.5 &&
      this.adaptiveState.consecutiveLowFPS === 0 &&
      this.adaptiveState.consecutiveHighMemory === 0
    ) && this.stats.lodLevel !== 'ultra';
    
    return { shouldDowngrade, canUpgrade };
  }

  /**
   * 降级LOD
   */
  private downgradeLOD(): void {
    const levels = Object.keys(this.lodConfig.levels) as Array<keyof typeof this.lodConfig.levels>;
    const currentIndex = levels.indexOf(this.stats.lodLevel);
    
    if (currentIndex < levels.length - 1) {
      this.stats.lodLevel = levels[currentIndex + 1];
      console.log(`LOD降级至: ${this.stats.lodLevel}`);
      this.notifyLODChange();
    }
  }

  /**
   * 升级LOD
   */
  private upgradeLOD(): void {
    const levels = Object.keys(this.lodConfig.levels) as Array<keyof typeof this.lodConfig.levels>;
    const currentIndex = levels.indexOf(this.stats.lodLevel);
    
    if (currentIndex > 0) {
      this.stats.lodLevel = levels[currentIndex - 1];
      console.log(`LOD升级至: ${this.stats.lodLevel}`);
      this.notifyLODChange();
    }
  }

  /**
   * 通知LOD变化
   */
  private notifyLODChange(): void {
    // 性能指标更新日志
    console.debug('RenderOptimizer 性能指标:', {
      renderTime: this.stats.renderTime,
      visibleFeatures: this.stats.visibleFeatures,
      culledFeatures: this.stats.culledFeatures,
      lodLevel: this.stats.lodLevel
    });
  }

  /**
   * 优化要素数据
   */
  optimizeFeatures(features: any[], zoom: number, bounds?: any): {
    optimizedFeatures: any[];
    stats: {
      original: number;
      optimized: number;
      culled: number;
      lodLevel: string;
    };
  } {
    const startTime = performance.now();
    
    // 获取当前LOD配置
    const lodLevel = this.getLODLevel(zoom);
    const lodConfig = this.lodConfig.levels[lodLevel];
    
    let optimizedFeatures = [...features];
    let culledCount = 0;
    
    // 视口裁剪
    if (bounds && this.cullingConfig.enabled) {
      const { visible, culled } = this.performViewportCulling(optimizedFeatures, bounds);
      optimizedFeatures = visible;
      culledCount = culled.length;
    }
    
    // LOD采样
    if (optimizedFeatures.length > lodConfig.maxFeatures) {
      optimizedFeatures = this.performLODSampling(optimizedFeatures, lodConfig.maxFeatures, lodConfig.quality);
    }
    
    // 更新统计
    this.stats.totalFeatures = features.length;
    this.stats.visibleFeatures = optimizedFeatures.length;
    this.stats.culledFeatures = culledCount;
    this.stats.renderTime = performance.now() - startTime;
    this.stats.lodLevel = lodLevel;
    
    return {
      optimizedFeatures,
      stats: {
        original: features.length,
        optimized: optimizedFeatures.length,
        culled: culledCount,
        lodLevel
      }
    };
  }

  /**
   * 获取LOD级别
   */
  private getLODLevel(zoom: number): keyof typeof this.lodConfig.levels {
    // 如果启用自适应模式，使用自适应LOD级别
    if (this.adaptiveState.isAdaptiveMode) {
      return this.stats.lodLevel;
    }
    
    // 否则根据缩放级别确定LOD
    const levels = this.lodConfig.levels;
    
    if (zoom >= levels.ultra.zoom) return 'ultra';
    if (zoom >= levels.high.zoom) return 'high';
    if (zoom >= levels.medium.zoom) return 'medium';
    if (zoom >= levels.low.zoom) return 'low';
    return 'minimal';
  }

  /**
   * 执行视口裁剪
   */
  private performViewportCulling(features: any[], bounds: any): {
    visible: any[];
    culled: any[];
  } {
    const visible: any[] = [];
    const culled: any[] = [];
    
    // 扩展边界
    const buffer = this.cullingConfig.bufferRatio;
    const extendedBounds = {
      north: bounds.north + (bounds.north - bounds.south) * buffer,
      south: bounds.south - (bounds.north - bounds.south) * buffer,
      east: bounds.east + (bounds.east - bounds.west) * buffer,
      west: bounds.west - (bounds.east - bounds.west) * buffer
    };
    
    features.forEach(feature => {
      if (this.isFeatureVisible(feature, extendedBounds)) {
        visible.push(feature);
      } else {
        culled.push(feature);
      }
    });
    
    return { visible, culled };
  }

  /**
   * 检查要素是否可见
   */
  private isFeatureVisible(feature: any, bounds: any): boolean {
    if (!feature.geometry || !feature.geometry.coordinates) {
      return false;
    }
    
    const coords = feature.geometry.coordinates;
    
    switch (feature.geometry.type) {
      case 'Point':
        const [lng, lat] = coords;
        return lng >= bounds.west && lng <= bounds.east && 
               lat >= bounds.south && lat <= bounds.north;
      
      case 'LineString':
        return coords.some(([lng, lat]: [number, number]) => 
          lng >= bounds.west && lng <= bounds.east && 
          lat >= bounds.south && lat <= bounds.north
        );
      
      case 'Polygon':
        return coords[0].some(([lng, lat]: [number, number]) => 
          lng >= bounds.west && lng <= bounds.east && 
          lat >= bounds.south && lat <= bounds.north
        );
      
      default:
        return true; // 未知类型默认可见
    }
  }

  /**
   * 执行LOD采样
   */
  private performLODSampling(features: any[], maxFeatures: number, quality: number): any[] {
    if (features.length <= maxFeatures) {
      return features;
    }
    
    // 根据质量参数选择采样策略
    if (quality >= 0.8) {
      // 高质量：智能采样，保留重要要素
      return this.intelligentSampling(features, maxFeatures);
    } else if (quality >= 0.5) {
      // 中等质量：均匀采样
      return this.uniformSampling(features, maxFeatures);
    } else {
      // 低质量：简单采样
      return this.simpleSampling(features, maxFeatures);
    }
  }

  /**
   * 智能采样
   */
  private intelligentSampling(features: any[], maxFeatures: number): any[] {
    // 按重要性排序（可以根据属性如状态、类型等）
    const sortedFeatures = features.sort((a, b) => {
      const priorityA = this.getFeaturePriority(a);
      const priorityB = this.getFeaturePriority(b);
      return priorityB - priorityA;
    });
    
    // 分层采样：确保高优先级要素优先保留
    const highPriority = sortedFeatures.filter(f => this.getFeaturePriority(f) >= 5);
    const mediumPriority = sortedFeatures.filter(f => {
      const priority = this.getFeaturePriority(f);
      return priority >= 2 && priority < 5;
    });
    const lowPriority = sortedFeatures.filter(f => this.getFeaturePriority(f) < 2);
    
    const result = [];
    const highCount = Math.min(highPriority.length, Math.floor(maxFeatures * 0.6));
    const mediumCount = Math.min(mediumPriority.length, Math.floor(maxFeatures * 0.3));
    const lowCount = Math.min(lowPriority.length, maxFeatures - highCount - mediumCount);
    
    result.push(...highPriority.slice(0, highCount));
    result.push(...mediumPriority.slice(0, mediumCount));
    result.push(...lowPriority.slice(0, lowCount));
    
    return result;
  }

  /**
   * 获取要素优先级
   */
  private getFeaturePriority(feature: any): number {
    let priority = 0;
    
    // 根据状态设置优先级
    if (feature.properties?.status === '红') priority += 10;
    else if (feature.properties?.status === '橙') priority += 5;
    else if (feature.properties?.status === '黄') priority += 3;
    
    // 根据类型设置优先级
    if (feature.properties?.type === 'CCTV') priority += 4;
    if (feature.properties?.type === 'sensor') priority += 3;
    if (feature.properties?.type === 'patrol') priority += 2;
    if (feature.properties?.type === 'bus') priority += 2;
    
    // 根据重要性等级设置优先级
    if (feature.properties?.importance === 'critical') priority += 8;
    else if (feature.properties?.importance === 'high') priority += 5;
    else if (feature.properties?.importance === 'medium') priority += 2;
    
    // 根据活动状态设置优先级
    if (feature.properties?.active === true) priority += 1;
    
    return priority;
  }

  /**
   * 均匀采样
   */
  private uniformSampling(features: any[], maxFeatures: number): any[] {
    if (features.length <= maxFeatures) return features;
    
    const step = features.length / maxFeatures;
    const sampled = [];
    
    // 使用更精确的采样算法
    for (let i = 0; i < maxFeatures; i++) {
      const index = Math.floor(i * step);
      if (index < features.length) {
        sampled.push(features[index]);
      }
    }
    
    return sampled;
  }

  /**
   * 简单采样
   */
  private simpleSampling(features: any[], maxFeatures: number): any[] {
    return features.slice(0, maxFeatures);
  }

  /**
   * 设置自适应模式
   */
  setAdaptiveMode(enabled: boolean): void {
    this.adaptiveState.isAdaptiveMode = enabled;
    console.log(`自适应渲染模式: ${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 更新LOD配置
   */
  updateLODConfig(config: Partial<typeof this.lodConfig>): void {
    this.lodConfig = { ...this.lodConfig, ...config };
    console.log('LOD配置已更新:', config);
  }

  /**
   * 更新视口裁剪配置
   */
  updateCullingConfig(config: Partial<typeof this.cullingConfig>): void {
    this.cullingConfig = { ...this.cullingConfig, ...config };
    console.log('视口裁剪配置已更新:', config);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): typeof this.stats & {
    renderQueueSize: number;
    adaptiveAdjustments: number;
    isAdaptiveMode: boolean;
  } {
    return {
      ...this.stats,
      renderQueueSize: this.renderQueue.length,
      adaptiveAdjustments: this.adaptiveState.adaptiveAdjustments,
      isAdaptiveMode: this.adaptiveState.isAdaptiveMode
    };
  }
  
  /**
   * 获取平均FPS
   */
  getAverageFPS(): number {
    if (this.stats.fpsHistory.length === 0) return 60; // 默认值
    
    const sum = this.stats.fpsHistory.reduce((acc, fps) => acc + fps, 0);
    return sum / this.stats.fpsHistory.length;
  }
  
  /**
   * 获取内存使用情况（估算）
   */
  getMemoryUsage(): number {
    // 基于要素数量和渲染复杂度估算内存使用
    const baseMemory = this.stats.totalFeatures * 0.001; // 每个要素约1KB
    const renderMemory = this.renderQueue.length * 0.01; // 渲染队列内存
    const cacheMemory = this.cullingConfig.spatialIndex.size * 0.005; // 缓存内存
    
    return Math.min(1.0, (baseMemory + renderMemory + cacheMemory) / 100); // 归一化到0-1
  }
  
  /**
   * 获取平均渲染时间
   */
  getAverageRenderTime(): number {
    if (this.stats.renderTimeHistory.length === 0) return 0;
    
    const sum = this.stats.renderTimeHistory.reduce((acc, time) => acc + time, 0);
    return sum / this.stats.renderTimeHistory.length;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
    
    this.renderQueue.length = 0;
    this.cullingConfig.spatialIndex.clear();
    
    // 清理性能监控
    console.log('RenderOptimizer destroyed');
    
    console.log('RenderOptimizer已销毁');
  }
}

// 导出全局实例
export const globalRenderOptimizer = new RenderOptimizer();