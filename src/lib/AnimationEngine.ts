import { FlowData, PatrolData } from '../types';
import { handleError, ErrorType, ErrorSeverity } from '../utils/errorHandler';

export interface AnimationConfig {
  duration: number; // 动画持续时间（毫秒）
  loop: boolean; // 是否循环
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AnimationState {
  id: string;
  startTime: number;
  duration: number;
  progress: number; // 0-1
  isActive: boolean;
  loop: boolean;
  easing: string;
}

export class PathAnimator {
  private animations: Map<string, AnimationState> = new Map();
  private animationFrame: number | null = null;
  private callbacks: Map<string, (progress: number, position: [number, number]) => void> = new Map();
  private isDestroyed: boolean = false;
  private performanceStats = {
    totalFrames: 0,
    errorCount: 0,
    lastUpdateTime: 0
  };

  constructor() {
    try {
      this.startAnimationLoop();
      console.log('PathAnimator initialized successfully');
    } catch (err) {
      console.error('PathAnimator initialization failed:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.CRITICAL, {
        component: 'PathAnimator',
        action: 'constructor'
      });
      throw err;
    }
  }

  // 启动动画循环
  private startAnimationLoop(): void {
    const animate = () => {
      if (this.isDestroyed) return;
      
      try {
        this.updateAnimations();
        this.animationFrame = requestAnimationFrame(animate);
      } catch (err) {
        console.error('Animation loop error:', err);
        this.performanceStats.errorCount++;
        handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
          component: 'PathAnimator',
          action: 'animation_loop'
        });
        
        // 尝试重新启动动画循环
        setTimeout(() => {
          if (!this.isDestroyed) {
            this.startAnimationLoop();
          }
        }, 1000);
      }
    };
    animate();
  }

  // 更新所有动画
  private updateAnimations(): void {
    try {
      this.performanceStats.totalFrames++;
      const currentTime = Date.now();
      
      this.animations.forEach((animation, id) => {
        if (!animation.isActive) return;

        try {
          const elapsed = currentTime - animation.startTime;
          let progress = elapsed / animation.duration;

          // 应用缓动函数
          progress = this.applyEasing(progress, animation.easing);

          if (progress >= 1) {
            if (animation.loop) {
              // 重新开始循环
              animation.startTime = currentTime;
              progress = 0;
            } else {
              // 动画完成
              progress = 1;
              animation.isActive = false;
            }
          }

          animation.progress = Math.max(0, Math.min(1, progress));

          // 触发回调
          const callback = this.callbacks.get(id);
          if (callback) {
            const position = this.calculatePosition(id, animation.progress);
            callback(animation.progress, position);
          }
        } catch (err) {
          console.error(`Animation update error for ${id}:`, err);
          this.performanceStats.errorCount++;
          // 停止有问题的动画
          animation.isActive = false;
        }
      });
      
      this.performanceStats.lastUpdateTime = currentTime;
    } catch (err) {
      console.error('Update animations error:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'PathAnimator',
        action: 'update_animations'
      });
    }
  }

  // 应用缓动函数
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - (1 - t) * (1 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'linear':
      default:
        return t;
    }
  }

  // 计算路径上的位置（需要在子类中实现）
  public calculatePosition(id: string, progress: number): [number, number] {
    // 默认实现，返回原点
    return [0, 0];
  }

  // 开始动画
  startAnimation(id: string, config: AnimationConfig): void {
    if (this.isDestroyed) {
      console.warn('Cannot start animation: PathAnimator is destroyed');
      return;
    }
    
    try {
      if (!id || !config) {
        throw new Error('Invalid animation parameters');
      }
      
      const animation: AnimationState = {
        id,
        startTime: Date.now(),
        duration: config.duration,
        progress: 0,
        isActive: true,
        loop: config.loop || false,
        easing: config.easing || 'linear'
      };
      
      this.animations.set(id, animation);
      console.log(`Animation ${id} started successfully`);
    } catch (err) {
      console.error(`Failed to start animation ${id}:`, err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'PathAnimator',
        action: 'start_animation',
        animationId: id
      });
    }
  }

  // 停止动画
  stopAnimation(id: string): void {
    try {
      if (!id) {
        throw new Error('Invalid animation ID');
      }
      
      this.animations.delete(id);
      this.callbacks.delete(id);
      console.log(`Animation ${id} stopped successfully`);
    } catch (err) {
      console.error(`Failed to stop animation ${id}:`, err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'PathAnimator',
        action: 'stop_animation',
        animationId: id
      });
    }
  }

  // 暂停动画
  pauseAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.isActive = false;
    }
  }

  // 恢复动画
  resumeAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.isActive = true;
      animation.startTime = Date.now() - (animation.progress * animation.duration);
    }
  }

  // 设置动画回调
  setCallback(id: string, callback: (progress: number, position: [number, number]) => void): void {
    this.callbacks.set(id, callback);
  }

  // 移除动画回调
  removeCallback(id: string): void {
    this.callbacks.delete(id);
  }

  // 获取动画状态
  getAnimationState(id: string): AnimationState | undefined {
    return this.animations.get(id);
  }

  // 获取所有活跃动画
  getActiveAnimations(): AnimationState[] {
    return Array.from(this.animations.values()).filter(anim => anim.isActive);
  }

  // 停止所有动画
  stopAllAnimations(): void {
    this.animations.forEach(animation => {
      animation.isActive = false;
    });
  }

  // 销毁动画器
  destroy(): void {
    if (this.isDestroyed) {
      console.warn('PathAnimator already destroyed');
      return;
    }
    
    try {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      this.animations.clear();
      this.callbacks.clear();
      this.isDestroyed = true;
      
      // 清理性能统计
      this.performanceStats = {
        totalFrames: 0,
        errorCount: 0,
        lastUpdateTime: 0
      };
      
      console.log('PathAnimator destroyed successfully');
    } catch (err) {
      console.error('Failed to destroy PathAnimator:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'PathAnimator',
        action: 'destroy'
      });
    }
  }
  
  // 获取性能统计
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      activeAnimations: this.animations.size,
      isDestroyed: this.isDestroyed
    };
  }
  
  // 检查是否已销毁
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }
}

// 路径动画器
export class RouteAnimator extends PathAnimator {
  private routes: Map<string, [number, number][]> = new Map();

  // 设置路径
  setPath(id: string, path: [number, number][]): void {
    if (this.getIsDestroyed()) {
      console.warn('Cannot set path: RouteAnimator is destroyed');
      return;
    }
    
    try {
      if (!id || !path || !Array.isArray(path) || path.length < 2) {
        throw new Error('Invalid path parameters');
      }
      
      this.routes.set(id, path);
      console.log(`Path set for route ${id} with ${path.length} points`);
    } catch (err) {
      console.error(`Failed to set path for route ${id}:`, err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'RouteAnimator',
        action: 'set_path',
        routeId: id
      });
    }
  }

  // 计算路径上的位置
  public calculatePosition(id: string, progress: number): [number, number] {
    try {
      const route = this.routes.get(id);
      if (!route || route.length < 2) {
        console.warn(`Invalid route for id ${id}`);
        return [0, 0];
      }

      if (typeof progress !== 'number' || progress < 0 || progress > 1) {
        console.warn(`Invalid progress value: ${progress}`);
        return route[0];
      }

      // 计算总路径长度
      const totalLength = this.calculatePathLength(route);
      const targetDistance = totalLength * progress;

      let currentDistance = 0;
      for (let i = 0; i < route.length - 1; i++) {
        const segmentLength = this.calculateDistance(route[i], route[i + 1]);
        
        if (currentDistance + segmentLength >= targetDistance) {
          // 在这个线段上
          const segmentProgress = (targetDistance - currentDistance) / segmentLength;
          return this.interpolatePoints(route[i], route[i + 1], segmentProgress);
        }
        
        currentDistance += segmentLength;
      }

      // 返回最后一个点
      return route[route.length - 1];
    } catch (err) {
      console.error(`Failed to calculate position for route ${id}:`, err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'RouteAnimator',
        action: 'calculate_position',
        routeId: id
      });
      return [0, 0];
    }
  }

  // 路径插值计算
  private interpolatePath(path: [number, number][], t: number): [number, number] {
    if (t <= 0) return path[0];
    if (t >= 1) return path[path.length - 1];

    const segments = path.length - 1;
    const segmentLength = 1 / segments;
    const segmentIndex = Math.floor(t / segmentLength);
    const segmentProgress = (t % segmentLength) / segmentLength;

    const startPoint = path[segmentIndex];
    const endPoint = path[Math.min(segmentIndex + 1, path.length - 1)];

    return [
      startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress,
      startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress
    ];
  }

  // 计算路径总长度
  calculatePathLength(path: [number, number][]): number {
    let totalLength = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i][0] - path[i - 1][0];
      const dy = path[i][1] - path[i - 1][1];
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }
    return totalLength;
  }

  // 计算两点间距离
  private calculateDistance(from: [number, number], to: [number, number]): number {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 两点间插值
  private interpolatePoints(from: [number, number], to: [number, number], t: number): [number, number] {
    return [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t
    ];
  }

  // 计算两点间的方向角度
  calculateBearing(from: [number, number], to: [number, number]): number {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }
}

// 人流动画管理器
export class FlowAnimationManager {
  private routeAnimator: RouteAnimator;
  private animator: RouteAnimator;
  private layerManager: any;
  private isRunning: boolean = false;
  private isDestroyed: boolean = false;
  private performanceStats = {
    animationCount: 0,
    errorCount: 0,
    lastStartTime: 0
  };

  constructor(layerManager: any) {
    try {
      if (!layerManager) {
        throw new Error('LayerManager is required');
      }
      
      this.layerManager = layerManager;
      this.routeAnimator = new RouteAnimator();
      this.animator = new RouteAnimator();
      console.log('FlowAnimationManager initialized successfully');
    } catch (err) {
      console.error('FlowAnimationManager initialization failed:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.CRITICAL, {
        component: 'FlowAnimationManager',
        action: 'constructor'
      });
      throw err;
    }
  }

  private updateCallback?: (flows: FlowData[]) => void;

  // 设置更新回调
  setUpdateCallback(callback: (flows: FlowData[]) => void): void {
    this.updateCallback = callback;
  }

  // 开始人流动画
  startFlowAnimation(flows: FlowData[]): void {
    if (this.isDestroyed) {
      console.warn('Cannot start: FlowAnimationManager is destroyed');
      return;
    }
    
    try {
      if (!flows || !Array.isArray(flows) || flows.length === 0) {
        throw new Error('Invalid flows data');
      }
      
      this.isRunning = true;
      this.performanceStats.animationCount = flows.length;
      this.performanceStats.lastStartTime = Date.now();
      
      flows.forEach(flow => {
        try {
          // 设置路径
          this.animator.setPath(flow.id, flow.path);
          
          // 设置回调
          this.animator.setCallback(flow.id, (progress, position) => {
            try {
              const updatedFlow = { ...flow, progress, currentPosition: position };
              if (this.updateCallback) {
                this.updateCallback([updatedFlow]);
              }
            } catch (err) {
              console.error(`Flow callback error for ${flow.id}:`, err);
              this.performanceStats.errorCount++;
            }
          });
          
          // 启动动画
          this.animator.startAnimation(flow.id, {
            duration: 30000 + Math.random() * 20000, // 30-50秒
            loop: true,
            easing: 'linear'
          });
        } catch (err) {
          console.error(`Failed to start flow animation ${flow.id}:`, err);
          this.performanceStats.errorCount++;
        }
      });
      
      console.log(`Started ${flows.length} flow animations`);
    } catch (err) {
      console.error('Failed to start flow animations:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'FlowAnimationManager',
        action: 'startFlowAnimation'
      });
    }
  }

  // 停止人流动画
  stopFlowAnimation(): void {
    try {
      this.isRunning = false;
      this.animator.stopAllAnimations();
      console.log('Flow animations stopped successfully');
    } catch (err) {
      console.error('Failed to stop flow animations:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'FlowAnimationManager',
        action: 'stopFlowAnimation'
      });
    }
  }

  // 获取当前人流数据
  getCurrentFlows(): FlowData[] {
    return this.animator.getActiveAnimations().map(anim => ({
      id: anim.id,
      progress: anim.progress,
      currentPosition: this.animator.calculatePosition ? this.animator.calculatePosition(anim.id, anim.progress) : [0, 0]
    })) as FlowData[];
  }

  // 获取运行状态
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // 获取性能统计
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      isRunning: this.isRunning,
      uptime: this.performanceStats.lastStartTime ? Date.now() - this.performanceStats.lastStartTime : 0
    };
  }

  // 销毁管理器
  destroy(): void {
    if (this.isDestroyed) {
      console.warn('FlowAnimationManager already destroyed');
      return;
    }
    
    try {
      this.stopFlowAnimation();
      this.animator.destroy();
      this.isDestroyed = true;
      
      // 清理性能统计
      this.performanceStats = {
        animationCount: 0,
        errorCount: 0,
        lastStartTime: 0
      };
      
      console.log('FlowAnimationManager destroyed successfully');
    } catch (err) {
      console.error('Failed to destroy FlowAnimationManager:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'FlowAnimationManager',
        action: 'destroy'
      });
    }
  }
}

// 巡更动画管理器
export class PatrolAnimationManager {
  private routeAnimator: RouteAnimator;
  private animator: RouteAnimator;
  private layerManager: any;
  private isRunning: boolean = false;
  private isDestroyed: boolean = false;
  private performanceStats = {
    animationCount: 0,
    errorCount: 0,
    lastStartTime: 0
  };

  constructor(layerManager: any) {
    try {
      if (!layerManager) {
        throw new Error('LayerManager is required');
      }
      
      this.layerManager = layerManager;
      this.routeAnimator = new RouteAnimator();
      this.animator = new RouteAnimator();
      console.log('PatrolAnimationManager initialized successfully');
    } catch (err) {
      console.error('PatrolAnimationManager initialization failed:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.CRITICAL, {
        component: 'PatrolAnimationManager',
        action: 'constructor'
      });
      throw err;
    }
  }

  private updateCallback?: (patrols: PatrolData[]) => void;
  private routes: Map<string, [number, number][]> = new Map();

  // 设置更新回调
  setUpdateCallback(callback: (patrols: PatrolData[]) => void): void {
    this.updateCallback = callback;
  }

  // 启动巡更动画
  startPatrolAnimation(patrols: PatrolData[]): void {
    if (this.isDestroyed) {
      console.warn('Cannot start: PatrolAnimationManager is destroyed');
      return;
    }
    
    try {
      if (!patrols || !Array.isArray(patrols) || patrols.length === 0) {
        throw new Error('Invalid patrols data');
      }
      
      this.isRunning = true;
      this.performanceStats.animationCount = patrols.length;
      this.performanceStats.lastStartTime = Date.now();
      
      patrols.forEach(patrol => {
          try {
            // 保存路径信息
            this.routes.set(patrol.id, patrol.route);
            // 设置路径
            this.animator.setPath(patrol.id, patrol.route);
          
          // 设置回调
          this.animator.setCallback(patrol.id, (progress, position) => {
            try {
              const updatedPatrol = { ...patrol, progress, currentPosition: position };
              if (this.updateCallback) {
                this.updateCallback([updatedPatrol]);
              }
            } catch (err) {
              console.error(`Patrol callback error for ${patrol.id}:`, err);
              this.performanceStats.errorCount++;
            }
          });

          // 启动动画
          this.animator.startAnimation(patrol.id, {
            duration: 60000 + Math.random() * 30000, // 60-90秒
            loop: true,
            easing: 'linear'
          });
        } catch (err) {
          console.error(`Failed to start patrol animation ${patrol.id}:`, err);
          this.performanceStats.errorCount++;
        }
      });
      
      console.log(`Started ${patrols.length} patrol animations`);
    } catch (err) {
      console.error('Failed to start patrol animations:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'PatrolAnimationManager',
        action: 'startPatrolAnimation'
      });
    }
  }

  // 停止巡更动画
  stopPatrolAnimation(): void {
    try {
      this.isRunning = false;
      this.animator.stopAllAnimations();
      console.log('Patrol animations stopped successfully');
    } catch (err) {
      console.error('Failed to stop patrol animations:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'PatrolAnimationManager',
        action: 'stopPatrolAnimation'
      });
    }
  }

  // 获取当前巡更数据
  getCurrentPatrols(): PatrolData[] {
    return this.animator.getActiveAnimations().map(anim => ({
      id: anim.id,
      guardName: `Guard ${anim.id}`,
      route: this.routes.get(anim.id) || [],
      currentPosition: this.animator.calculatePosition ? this.animator.calculatePosition(anim.id, anim.progress) : [0, 0],
      progress: anim.progress,
      status: '巡逻中' as const
    })) as PatrolData[];
  }

  // 销毁管理器
  destroy(): void {
    if (this.isDestroyed) {
      console.warn('PatrolAnimationManager already destroyed');
      return;
    }
    
    try {
      this.stopPatrolAnimation();
      this.animator.destroy();
      this.isDestroyed = true;
      
      // 清理性能统计
      this.performanceStats = {
        animationCount: 0,
        errorCount: 0,
        lastStartTime: 0
      };
      
      console.log('PatrolAnimationManager destroyed successfully');
    } catch (err) {
      console.error('Failed to destroy PatrolAnimationManager:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'PatrolAnimationManager',
        action: 'destroy'
      });
    }
  }
  
  // 获取性能统计
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      isRunning: this.isRunning,
      isDestroyed: this.isDestroyed
    };
  }
  
  // 检查是否已销毁
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }

  // 检查是否正在运行
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

// 动画引擎主类
export class AnimationEngine {
  private flowManager: FlowAnimationManager;
  private patrolManager: PatrolAnimationManager;
  private layerManager: any;
  private isRunning: boolean = false;
  private isDestroyed: boolean = false;
  private performanceStats = {
    totalAnimations: 0,
    errorCount: 0,
    initTime: 0
  };

  constructor(layerManager: any) {
    try {
      if (!layerManager) {
        throw new Error('LayerManager is required');
      }
      
      this.layerManager = layerManager;
      this.flowManager = new FlowAnimationManager(layerManager);
      this.patrolManager = new PatrolAnimationManager(layerManager);
      this.performanceStats.initTime = Date.now();
      
      console.log('AnimationEngine initialized successfully');
    } catch (err) {
      console.error('AnimationEngine initialization failed:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.CRITICAL, {
        component: 'AnimationEngine',
        action: 'constructor'
      });
      throw err;
    }
  }

  // 获取人流管理器
  getFlowManager(): FlowAnimationManager {
    return this.flowManager;
  }

  // 获取巡更管理器
  getPatrolManager(): PatrolAnimationManager {
    return this.patrolManager;
  }

  // 启动人流动画
  startFlowAnimation(flows: FlowData[]): void {
    if (this.isDestroyed) {
      console.warn('Cannot start flow animation: AnimationEngine is destroyed');
      return;
    }
    
    try {
      this.flowManager.startFlowAnimation(flows);
      this.performanceStats.totalAnimations += flows.length;
      this.isRunning = true;
      console.log(`Started ${flows.length} flow animations`);
    } catch (err) {
      console.error('Failed to start flow animation:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'startFlowAnimation'
      });
    }
  }

  // 启动巡更动画
  startPatrolAnimation(patrols: PatrolData[]): void {
    if (this.isDestroyed) {
      console.warn('Cannot start patrol animation: AnimationEngine is destroyed');
      return;
    }
    
    try {
      this.patrolManager.startPatrolAnimation(patrols);
      this.performanceStats.totalAnimations += patrols.length;
      this.isRunning = true;
      console.log(`Started ${patrols.length} patrol animations`);
    } catch (err) {
      console.error('Failed to start patrol animation:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'startPatrolAnimation'
      });
    }
  }

  // 停止人流动画
  stopFlowAnimation(): void {
    try {
      this.flowManager.stopFlowAnimation();
      this.checkRunningStatus();
      console.log('Flow animations stopped');
    } catch (err) {
      console.error('Failed to stop flow animation:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'AnimationEngine',
        action: 'stopFlowAnimation'
      });
    }
  }

  // 停止巡更动画
  stopPatrolAnimation(): void {
    try {
      this.patrolManager.stopPatrolAnimation();
      this.checkRunningStatus();
      console.log('Patrol animations stopped');
    } catch (err) {
      console.error('Failed to stop patrol animation:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'AnimationEngine',
        action: 'stopPatrolAnimation'
      });
    }
  }

  // 停止所有动画
  stopAllAnimations(): void {
    try {
      this.flowManager.stopFlowAnimation();
      this.patrolManager.stopPatrolAnimation();
      this.isRunning = false;
      console.log('All animations stopped');
    } catch (err) {
      console.error('Failed to stop all animations:', err);
      this.performanceStats.errorCount++;
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'stopAllAnimations'
      });
    }
  }

  // 检查运行状态
  private checkRunningStatus(): void {
    try {
      // 如果两个管理器都没有运行动画，则停止引擎
      if (!this.flowManager.getIsRunning() && 
          !this.patrolManager.getIsRunning()) {
        this.isRunning = false;
      }
    } catch (err) {
      console.error('Failed to check running status:', err);
      this.performanceStats.errorCount++;
    }
  }

  // 启动动画引擎
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('动画引擎已启动');
  }

  // 停止动画引擎
  stop(): void {
    if (!this.isRunning) return;
    
    this.flowManager.stopFlowAnimation();
    this.patrolManager.stopPatrolAnimation();
    this.isRunning = false;
    console.log('动画引擎已停止');
  }

  // 检查是否运行中
  isActive(): boolean {
    return this.isRunning;
  }

  // 获取性能统计
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      isRunning: this.isRunning,
      isDestroyed: this.isDestroyed,
      flowStats: this.flowManager.getPerformanceStats(),
      patrolStats: this.patrolManager.getPerformanceStats()
    };
  }

  // 销毁动画引擎
  destroy(): void {
    if (this.isDestroyed) {
      console.warn('AnimationEngine already destroyed');
      return;
    }
    
    try {
      this.stop();
      this.flowManager.destroy();
      this.patrolManager.destroy();
      this.isDestroyed = true;
      
      // 清理性能统计
      this.performanceStats = {
        totalAnimations: 0,
        errorCount: 0,
        initTime: 0
      };
      
      console.log('AnimationEngine destroyed successfully');
    } catch (err) {
      console.error('Failed to destroy AnimationEngine:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'AnimationEngine',
        action: 'destroy'
      });
    }
  }
}