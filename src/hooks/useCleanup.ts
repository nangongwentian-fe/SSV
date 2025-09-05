/**
 * 组件卸载清理Hook
 * 确保React组件在卸载时正确清理所有资源
 */
import { useEffect, useRef, useCallback } from 'react';
import { globalTimerManager } from '../utils/TimerManager';
import { globalResourceManager } from '../utils/ResourceManager';
import { globalMemoryLeakDetector } from '../utils/MemoryLeakDetector';

type CleanupFunction = () => void;
type EventTarget = {
  addEventListener?: (event: string, handler: any, options?: any) => void;
  removeEventListener: (event: string, handler: any, options?: any) => void;
};

interface CleanupRegistry {
  timers: Set<string>;
  intervals: Set<string>;
  animationFrames: Set<string>;
  eventListeners: Array<{
    target: EventTarget;
    event: string;
    handler: any;
    options?: any;
  }>;
  subscriptions: Set<CleanupFunction>;
  customCleanups: Set<CleanupFunction>;
}

/**
 * 组件卸载清理Hook
 * @param componentName 组件名称，用于调试和统计
 * @returns 清理注册器和手动清理函数
 */
export function useCleanup(componentName?: string) {
  const cleanupRegistry = useRef<CleanupRegistry>({
    timers: new Set(),
    intervals: new Set(),
    animationFrames: new Set(),
    eventListeners: [],
    subscriptions: new Set(),
    customCleanups: new Set()
  });

  const componentId = useRef(`${componentName || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  /**
   * 注册定时器
   */
  const registerTimer = useCallback((timerId: string, callback: () => void, delay: number) => {
    const id = globalTimerManager.setTimeout(timerId, callback, delay);
    cleanupRegistry.current.timers.add(timerId);
    return id;
  }, []);

  /**
   * 注册间隔定时器
   */
  const registerInterval = useCallback((intervalId: string, callback: () => void, interval: number) => {
    const id = globalTimerManager.setInterval(intervalId, callback, interval);
    cleanupRegistry.current.intervals.add(intervalId);
    return id;
  }, []);

  /**
   * 注册动画帧
   */
  const registerAnimationFrame = useCallback((frameId: string, callback: () => void) => {
    const id = globalTimerManager.requestAnimationFrame(frameId, callback);
    cleanupRegistry.current.animationFrames.add(frameId);
    return id;
  }, []);

  /**
   * 注册事件监听器
   */
  const registerEventListener = useCallback(<T extends EventTarget>(
    target: T,
    event: string,
    handler: any,
    options?: any
  ) => {
    target.addEventListener?.(event, handler, options);
    cleanupRegistry.current.eventListeners.push({
      target,
      event,
      handler,
      options
    });

    // 返回清理函数
    return () => {
      target.removeEventListener(event, handler, options);
      const index = cleanupRegistry.current.eventListeners.findIndex(
        item => item.target === target && item.event === event && item.handler === handler
      );
      if (index > -1) {
        cleanupRegistry.current.eventListeners.splice(index, 1);
      }
    };
  }, []);

  /**
   * 注册订阅（如状态管理订阅）
   */
  const registerSubscription = useCallback((unsubscribe: CleanupFunction) => {
    cleanupRegistry.current.subscriptions.add(unsubscribe);
    
    // 返回清理函数
    return () => {
      cleanupRegistry.current.subscriptions.delete(unsubscribe);
      unsubscribe();
    };
  }, []);

  /**
   * 注册自定义清理函数
   */
  const registerCleanup = useCallback((cleanup: CleanupFunction) => {
    cleanupRegistry.current.customCleanups.add(cleanup);
    
    // 返回取消注册函数
    return () => {
      cleanupRegistry.current.customCleanups.delete(cleanup);
    };
  }, []);

  /**
   * 执行所有清理
   */
  const performCleanup = useCallback(() => {
    const registry = cleanupRegistry.current;
    let cleanedCount = 0;

    try {
      // 清理定时器
      registry.timers.forEach(timerId => {
        globalTimerManager.clearTimeout(timerId);
        cleanedCount++;
      });
      registry.timers.clear();

      // 清理间隔定时器
      registry.intervals.forEach(intervalId => {
        globalTimerManager.clearInterval(intervalId);
        cleanedCount++;
      });
      registry.intervals.clear();

      // 清理动画帧
      registry.animationFrames.forEach(frameId => {
        globalTimerManager.cancelAnimationFrame(frameId);
        cleanedCount++;
      });
      registry.animationFrames.clear();

      // 清理事件监听器
      registry.eventListeners.forEach(({ target, event, handler, options }) => {
        try {
          target.removeEventListener(event, handler, options);
          cleanedCount++;
        } catch (error) {
          console.warn(`清理事件监听器失败 (${event}):`, error);
        }
      });
      registry.eventListeners.length = 0;

      // 清理订阅
      registry.subscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
          cleanedCount++;
        } catch (error) {
          console.warn('清理订阅失败:', error);
        }
      });
      registry.subscriptions.clear();

      // 清理自定义清理函数
      registry.customCleanups.forEach(cleanup => {
        try {
          cleanup();
          cleanedCount++;
        } catch (error) {
          console.warn('执行自定义清理失败:', error);
        }
      });
      registry.customCleanups.clear();

      // 记录清理统计
      if (componentName && cleanedCount > 0) {
        console.debug(`组件 ${componentName} 清理了 ${cleanedCount} 个资源`);
      }

    } catch (error) {
      console.error(`组件 ${componentName} 清理过程中发生错误:`, error);
    }
  }, [componentName]);

  /**
   * 获取清理统计
   */
  const getCleanupStats = useCallback(() => {
    const registry = cleanupRegistry.current;
    return {
      componentId: componentId.current,
      componentName: componentName || 'unknown',
      timers: registry.timers.size,
      intervals: registry.intervals.size,
      animationFrames: registry.animationFrames.size,
      eventListeners: registry.eventListeners.length,
      subscriptions: registry.subscriptions.size,
      customCleanups: registry.customCleanups.size,
      total: registry.timers.size + 
             registry.intervals.size + 
             registry.animationFrames.size + 
             registry.eventListeners.length + 
             registry.subscriptions.size + 
             registry.customCleanups.size
    };
  }, [componentName]);

  /**
   * 检查是否有未清理的资源
   */
  const hasUncleanedResources = useCallback(() => {
    const stats = getCleanupStats();
    return stats.total > 0;
  }, [getCleanupStats]);

  // 组件挂载时注册到资源管理器
  useEffect(() => {
    const componentInfo = {
      id: componentId.current,
      name: componentName || 'unknown',
      mountTime: Date.now()
    };

    globalResourceManager.registerCleanup(componentInfo.id, performCleanup);

    // 在开发环境下启用内存泄漏检测
    if (process.env.NODE_ENV === 'development') {
      globalMemoryLeakDetector.start({
        enabled: true,
        checkInterval: 10000, // 10秒检测一次
        autoCleanup: false // 开发环境不自动清理
      });
    }

    return () => {
      // 组件卸载时执行清理
      performCleanup();
      globalResourceManager.unregisterCleanup(componentInfo.id);

      // 在开发环境下检查是否有未清理的资源
      if (process.env.NODE_ENV === 'development' && hasUncleanedResources()) {
        console.warn(`组件 ${componentName} 卸载时仍有未清理的资源:`, getCleanupStats());
      }
    };
  }, [componentName, performCleanup, hasUncleanedResources, getCleanupStats]);

  return {
    // 注册函数
    registerTimer,
    registerInterval,
    registerAnimationFrame,
    registerEventListener,
    registerSubscription,
    registerCleanup,
    
    // 清理函数
    performCleanup,
    
    // 统计函数
    getCleanupStats,
    hasUncleanedResources,
    
    // 组件信息
    componentId: componentId.current,
    componentName: componentName || 'unknown'
  };
}

/**
 * 简化版清理Hook，只提供基本的清理注册功能
 */
export function useSimpleCleanup() {
  const cleanups = useRef<CleanupFunction[]>([]);

  const addCleanup = useCallback((cleanup: CleanupFunction) => {
    cleanups.current.push(cleanup);
    
    // 返回移除函数
    return () => {
      const index = cleanups.current.indexOf(cleanup);
      if (index > -1) {
        cleanups.current.splice(index, 1);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanups.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('清理函数执行失败:', error);
        }
      });
      cleanups.current.length = 0;
    };
  }, []);

  return { addCleanup };
}

/**
 * 自动清理定时器Hook
 * @param componentName 组件名称
 * @param callback 回调函数
 * @param interval 间隔时间（毫秒）
 * @param enabled 是否启用定时器
 */
export function useAutoCleanupTimer(
  componentName: string,
  callback: () => void,
  interval: number,
  enabled: boolean = true
) {
  const { registerInterval } = useCleanup(componentName);
  const callbackRef = useRef(callback);
  const intervalRef = useRef<string | null>(null);

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (enabled) {
      const intervalId = `${componentName}-interval-${Date.now()}`;
      intervalRef.current = intervalId;
      registerInterval(intervalId, () => callbackRef.current(), interval);
    } else {
      intervalRef.current = null;
    }
  }, [enabled, interval, componentName, registerInterval]);

  return intervalRef.current;
}

/**
 * 手动定时器管理Hook
 */
export function useTimerManager() {
  const { registerTimer, registerInterval, registerAnimationFrame } = useCleanup('timer-manager');

  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timerId = `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return registerTimer(timerId, callback, delay);
  }, [registerTimer]);

  const setInterval = useCallback((callback: () => void, interval: number) => {
    const intervalId = `interval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return registerInterval(intervalId, callback, interval);
  }, [registerInterval]);

  const requestAnimationFrame = useCallback((callback: () => void) => {
    const frameId = `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return registerAnimationFrame(frameId, callback);
  }, [registerAnimationFrame]);

  return {
    setTimeout,
    setInterval,
    requestAnimationFrame
  };
}

export default useCleanup;