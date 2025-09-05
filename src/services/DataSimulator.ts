// 数据模拟器核心类
// 负责管理所有实时数据的模拟和更新

import { globalPerformanceOptimizer } from "../utils/PerformanceOptimizer";
import { globalTimerManager } from '../utils/TimerManager';

export interface KPIData {
  energyConsumption: number;
  waterUsage: number;
  occupancyRate: number;
  maintenanceEfficiency: number;
  securityScore: number;
  environmentalScore: number;
  temperature: number;
  humidity: number;
  airQuality: number;
  noiseLevel: number;
  onlineUsers: number;
  timestamp?: Date;
}

export interface ElevatorStatus {
  id: string;
  floor: number;
  currentFloor: number;
  direction: '↑' | '↓' | '—';
  status: '正常' | '维保' | '高峰模式';
  load?: number;
  targetFloor?: number;
  waitingCalls?: number[];
  lastMaintenance?: Date;
  lastUpdate: Date;
}

export interface ANPRLog {
  id: string;
  timestamp: Date;
  plateNumber: string;
  action: '进场' | '出场';
  location: string;
  isBlacklisted?: boolean;
}

// 事件类型定义
export type DataEvent = 'kpi-update' | 'elevator-update' | 'anpr-log';

// 事件监听器类型
export type EventListener<T = any> = (data: T) => void;

/**
 * 数据模拟器核心类
 * 实现定时器管理和事件总线系统
 */
export class DataSimulator {
  private timerIds: Set<string> = new Set();
  private listeners: Map<DataEvent, EventListener[]> = new Map();
  private isRunning: boolean = false;
  private performanceOptimizer = globalPerformanceOptimizer;
  private memoryUsage: { [key: string]: number } = {};
  private eventCounts: { [key: string]: number } = {};

  constructor() {
    // 初始化事件监听器映射
    this.listeners.set('kpi-update', []);
    this.listeners.set('elevator-update', []);
    this.listeners.set('anpr-log', []);
    
    // 初始化性能监控
    console.log('DataSimulator initialized');
  }

  /**
   * 订阅事件
   */
  subscribe<T>(event: DataEvent, callback: EventListener<T>): void {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.push(callback);
    this.listeners.set(event, eventListeners);
  }

  /**
   * 取消订阅事件
   */
  unsubscribe<T>(event: DataEvent, callback: EventListener<T>): void {
    const eventListeners = this.listeners.get(event) || [];
    const index = eventListeners.indexOf(callback);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private emit<T>(event: DataEvent, data: T): void {
    const startTime = performance.now();
    const eventListeners = this.listeners.get(event) || [];
    
    // 更新事件计数
    this.eventCounts[event] = (this.eventCounts[event] || 0) + 1;
    
    eventListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    
    // 记录性能指标
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 估算内存使用（简化版）
    const dataSize = JSON.stringify(data).length;
    this.memoryUsage[event] = (this.memoryUsage[event] || 0) + dataSize;
    
    // 性能指标更新日志
    if (this.performanceOptimizer && duration > 5) { // 只报告耗时超过5ms的事件
      console.debug('DataSimulator 性能指标:', {
        dataProcessingTime: duration,
        activeDataSources: this.eventCounts[event],
        memoryUsage: dataSize
      });
    }
  }

  /**
   * 启动KPI数据模拟
   * 每2.2秒更新一次
   */
  startKPISimulation(): void {
    const timerId = 'data-simulator-kpi';
    if (this.timerIds.has(timerId)) {
      console.warn('KPI simulation is already running');
      return;
    }

    globalTimerManager.setInterval(timerId, () => {
      const kpiData: KPIData = {
        energyConsumption: this.randomBetween(2200, 5200),
        waterUsage: this.randomBetween(120, 480),
        occupancyRate: this.randomBetween(18, 88),
        maintenanceEfficiency: this.randomBetween(78, 98),
        securityScore: this.randomBetween(85, 98),
        environmentalScore: this.randomBetween(75, 95),
        temperature: this.randomBetween(20, 26),
        humidity: this.randomBetween(40, 60),
        airQuality: this.randomBetween(80, 95),
        noiseLevel: this.randomBetween(35, 55),
        onlineUsers: this.randomBetween(50, 200),
        timestamp: new Date()
      };

      this.emit('kpi-update', kpiData);
    }, 2200); // 2.2秒间隔

    this.timerIds.add(timerId);
    console.log('KPI simulation started');
  }

  /**
   * 启动电梯状态模拟
   * 每3秒更新一次
   */
  startElevatorSimulation(): void {
    const timerId = 'data-simulator-elevator';
    if (this.timerIds.has(timerId)) {
      console.warn('Elevator simulation is already running');
      return;
    }

    globalTimerManager.setInterval(timerId, () => {
      const elevators: ElevatorStatus[] = Array.from({ length: 6 }, (_, i) => {
        const elevatorId = `L${i + 1}`;
        
        // L4 设置为维保状态
        if (i === 3) {
          return {
            id: elevatorId,
            floor: 0,
            currentFloor: 0,
            direction: '—',
            status: '维保',
            load: 0,
            targetFloor: 0,
            waitingCalls: [],
            lastMaintenance: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            lastUpdate: new Date()
          };
        }
        
        // L3 设置为高峰模式
        if (i === 2) {
          const currentFloor = Math.floor(Math.random() * 19);
          const callCount = this.randomBetween(2, 8);
          const waitingCalls = Array.from({ length: callCount }, () => Math.floor(Math.random() * 19));
          return {
            id: elevatorId,
            floor: currentFloor,
            currentFloor: currentFloor,
            direction: ['↑', '↓'][Math.floor(Math.random() * 2)] as '↑' | '↓',
            status: '高峰模式',
            load: this.randomBetween(8, 15),
            targetFloor: Math.floor(Math.random() * 19),
            waitingCalls: waitingCalls,
            lastUpdate: new Date()
          };
        }
        
        // 其他电梯正常运行
        const currentFloor = Math.floor(Math.random() * 19);
        const callCount = this.randomBetween(0, 3);
        const waitingCalls = Array.from({ length: callCount }, () => Math.floor(Math.random() * 19));
        return {
          id: elevatorId,
          floor: currentFloor,
          currentFloor: currentFloor,
          direction: ['↑', '↓', '—'][Math.floor(Math.random() * 3)] as '↑' | '↓' | '—',
          status: '正常',
          load: this.randomBetween(0, 12),
          targetFloor: Math.random() > 0.5 ? Math.floor(Math.random() * 19) : undefined,
          waitingCalls: waitingCalls,
          lastUpdate: new Date()
        };
      });

      this.emit('elevator-update', elevators);
    }, 3000); // 3秒间隔

    this.timerIds.add(timerId);
    console.log('Elevator simulation started');
  }

  /**
   * 启动ANPR日志模拟
   * 每2.2秒有60%概率生成一条记录
   */
  startANPRSimulation(): void {
    const timerId = 'data-simulator-anpr';
    if (this.timerIds.has(timerId)) {
      console.warn('ANPR simulation is already running');
      return;
    }

    globalTimerManager.setInterval(timerId, () => {
      // 60%概率生成记录
      if (Math.random() > 0.6) {
        const log: ANPRLog = {
          id: `anpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          plateNumber: this.generatePlateNumber(),
          action: Math.random() > 0.7 ? '出场' : '进场',
          location: 'Main Gate',
          isBlacklisted: Math.random() > 0.95 // 5%概率为黑名单
        };

        this.emit('anpr-log', log);
      }
    }, 2200); // 2.2秒间隔

    this.timerIds.add(timerId);
    console.log('ANPR simulation started');
  }

  /**
   * 启动所有模拟
   */
  startAll(): void {
    if (this.isRunning) {
      console.warn('Data simulation is already running');
      return;
    }

    this.startKPISimulation();
    this.startElevatorSimulation();
    this.startANPRSimulation();
    
    // 启动内存清理定时器（每10分钟）
    globalTimerManager.setInterval('data-simulator-memory-cleanup', () => {
      this.cleanupMemoryStats();
    }, 10 * 60 * 1000);
    this.timerIds.add('data-simulator-memory-cleanup');
    
    this.isRunning = true;
    console.log('All data simulations started');
  }

  /**
   * 停止特定模拟
   */
  stop(type: string): void {
    const timerId = `data-simulator-${type}`;
    if (this.timerIds.has(timerId)) {
      globalTimerManager.clearInterval(timerId);
      this.timerIds.delete(timerId);
      console.log(`${type} simulation stopped`);
    }
  }

  /**
   * 停止所有模拟
   */
  stopAll(): void {
    this.timerIds.forEach((timerId) => {
      globalTimerManager.clearInterval(timerId);
      console.log(`${timerId} simulation stopped`);
    });
    this.timerIds.clear();
    this.isRunning = false;
    console.log('All data simulations stopped');
  }

  /**
   * 清理内存使用统计
   */
  private cleanupMemoryStats(): void {
    // 每10分钟清理一次累积的内存使用统计
    Object.keys(this.memoryUsage).forEach(key => {
      this.memoryUsage[key] = Math.max(0, this.memoryUsage[key] * 0.9); // 减少10%
    });
    
    // 检测内存泄漏
    const totalMemory = Object.values(this.memoryUsage).reduce((sum, val) => sum + val, 0);
    if (totalMemory > 50000) {
      console.warn('检测到可能的内存泄漏，总内存使用:', totalMemory, '字节');
      // 通知性能优化器进行强制内存清理
      this.performanceOptimizer.forceMemoryCleanup();
    }
    
    // 内存清理性能指标日志
    console.debug('DataSimulator 内存清理指标:', {
      memoryUsage: totalMemory / (1024 * 1024),
      cleanupOperations: this.timerIds.size
    });
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    memoryUsage: { [key: string]: number };
    eventCounts: { [key: string]: number };
    activeTimers: string[];
  } {
    return {
      memoryUsage: { ...this.memoryUsage },
      eventCounts: { ...this.eventCounts },
      activeTimers: Array.from(this.timerIds)
    };
  }

  /**
   * 销毁数据模拟器
   */
  destroy(): void {
    // 停止所有定时器
    this.stopAll();
    
    // 清理所有监听器
    this.listeners.clear();
    
    // 清理内存统计
    this.memoryUsage = {};
    this.eventCounts = {};
    
    // 清理性能优化器相关资源
    if (this.performanceOptimizer) {
      try {
        // 性能优化器会在组件销毁时自动清理相关资源
        console.log('DataSimulator performance optimizer resources cleaned');
      } catch (error) {
        console.warn('Failed to cleanup performance optimizer resources:', error);
      }
    }
    
    // 尝试触发垃圾回收
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
    
    console.log('DataSimulator destroyed');
  }

  /**
   * 获取运行状态
   */
  getStatus(): { isRunning: boolean; activeTimers: string[] } {
    return {
      isRunning: this.isRunning,
      activeTimers: Array.from(this.timerIds)
    };
  }

  /**
   * 生成随机车牌号
   */
  private generatePlateNumber(): string {
    const prefixes = ['XX', 'HK', 'VR', 'CN', 'AM', 'ZZ'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${number}`;
  }

  /**
   * 生成指定范围内的随机数
   */
  private randomBetween(min: number, max: number): number {
    return Math.round(Math.random() * (max - min) + min);
  }
}

// 导出单例实例
export const dataSimulator = new DataSimulator();