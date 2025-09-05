import { AnimationEngine, BusData } from './AnimationEngine';
import { LayerManager } from '../lib/LayerManager';
import { globalTimerManager } from '../utils/TimerManager';

export interface BusRoute {
  id: string;
  name: string;
  points: [number, number][];
  stops: BusStop[];
  duration: number; // 单程时间（分钟）
  frequency: number; // 发车间隔（分钟）
}

export interface BusStop {
  id: string;
  name: string;
  position: [number, number];
  waitTime: number; // 停靠时间（秒）
}

export interface ShuttleBus {
  id: string;
  routeId: string;
  currentPosition: [number, number];
  direction: 'forward' | 'backward';
  progress: number; // 0-1
  status: 'running' | 'stopped' | 'maintenance';
  passengers: number;
  capacity: number;
  nextStop: string;
  estimatedArrival: number; // 秒
}

export interface BusStatistics {
  totalBuses: number;
  activeBuses: number;
  totalPassengers: number;
  tripsCompleted: number;
  averageWaitTime: number; // 分钟
  onTimePerformance: number; // 百分比
}

export class ShuttleBusSystem {
  private animationEngine: AnimationEngine;
  private layerManager: LayerManager;
  private isRunning: boolean = false;
  private buses: Map<string, ShuttleBus> = new Map();
  private routes: Map<string, BusRoute> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private statistics: BusStatistics;
  private onStatisticsUpdate?: (stats: BusStatistics) => void;
  private startTime: number = 0;

  // 预定义穿梭巴士路线
  private predefinedRoutes: BusRoute[] = [
    {
      id: 'route-main',
      name: '主线路（启德站 ↔ Runway 1331）',
      points: [
        [114.1994, 22.3304], // 启德站
        [114.2006, 22.3297], // 中转点1
        [114.2015, 22.3285], // 中转点2
        [114.2025, 22.3270], // 中转点3
        [114.19733, 22.32235], // KTSP
        [114.2055, 22.3245], // 中转点4
        [114.2095, 22.3155], // 中转点5
        [114.2128, 22.3074] // Runway 1331
      ],
      stops: [
        {
          id: 'stop-mtr',
          name: '启德站',
          position: [114.1994, 22.3304],
          waitTime: 30
        },
        {
          id: 'stop-ktsp',
          name: '启德体育园',
          position: [114.19733, 22.32235],
          waitTime: 45
        },
        {
          id: 'stop-runway',
          name: 'Runway 1331',
          position: [114.2128, 22.3074],
          waitTime: 30
        }
      ],
      duration: 12, // 12分钟单程
      frequency: 8 // 8分钟一班
    },
    {
      id: 'route-loop',
      name: '环线（体育园周边）',
      points: [
        [114.19733, 22.32235], // KTSP起点
        [114.1985, 22.3245], // 北侧
        [114.2015, 22.3255], // 东北
        [114.2035, 22.3240], // 东侧
        [114.2025, 22.3210], // 东南
        [114.1995, 22.3200], // 南侧
        [114.1975, 22.3215], // 西南
        [114.1965, 22.3230], // 西侧
        [114.19733, 22.32235] // 回到起点
      ],
      stops: [
        {
          id: 'stop-ktsp-main',
          name: '体育园主入口',
          position: [114.19733, 22.32235],
          waitTime: 20
        },
        {
          id: 'stop-north',
          name: '北门',
          position: [114.1985, 22.3245],
          waitTime: 15
        },
        {
          id: 'stop-east',
          name: '东门',
          position: [114.2035, 22.3240],
          waitTime: 15
        },
        {
          id: 'stop-south',
          name: '南门',
          position: [114.1995, 22.3200],
          waitTime: 15
        }
      ],
      duration: 8, // 8分钟一圈
      frequency: 6 // 6分钟一班
    }
  ];

  constructor(animationEngine: AnimationEngine, layerManager: LayerManager) {
    this.animationEngine = animationEngine;
    this.layerManager = layerManager;
    
    // 初始化路线
    this.predefinedRoutes.forEach(route => {
      this.routes.set(route.id, route);
    });
    
    this.statistics = this.initializeStatistics();
  }

  /**
   * 启动穿梭巴士系统
   * @param busCount 巴士数量
   */
  startBusSystem(busCount: number = 3): void {
    if (this.isRunning) {
      this.stopBusSystem();
    }

    this.isRunning = true;
    this.startTime = Date.now();
    
    // 创建穿梭巴士
    this.createShuttleBuses(busCount);
    
    // 启动所有巴士动画
    this.buses.forEach(bus => {
      this.startBusAnimation(bus);
    });
    
    // 启动统计更新
    this.startStatisticsUpdate();
    
    console.log(`穿梭巴士系统已启动，${busCount}辆巴士开始运营`);
  }

  /**
   * 停止穿梭巴士系统
   */
  stopBusSystem(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // 停止所有动画
    this.animationFrames.forEach((frameId, busId) => {
      cancelAnimationFrame(frameId);
    });
    this.animationFrames.clear();
    
    // 清空巴士图层
    this.layerManager.updateLayerData('bus-src', {
      type: 'FeatureCollection',
      features: []
    });
    
    console.log('穿梭巴士系统已停止');
  }

  /**
   * 添加穿梭巴士
   * @param routeId 路线ID
   */
  addShuttleBus(routeId: string): string {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error(`路线 ${routeId} 不存在`);
    }

    const busId = `bus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const bus: ShuttleBus = {
      id: busId,
      routeId,
      currentPosition: route.points[0],
      direction: 'forward',
      progress: Math.random() * 0.2, // 随机起始位置
      status: 'running',
      passengers: Math.floor(Math.random() * 30), // 随机乘客数
      capacity: 40,
      nextStop: route.stops[0].name,
      estimatedArrival: Math.floor(Math.random() * 300) + 60 // 1-6分钟
    };
    
    this.buses.set(busId, bus);
    
    if (this.isRunning) {
      this.startBusAnimation(bus);
    }
    
    return busId;
  }

  /**
   * 移除穿梭巴士
   * @param busId 巴士ID
   */
  removeShuttleBus(busId: string): void {
    const frameId = this.animationFrames.get(busId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(busId);
    }
    
    this.buses.delete(busId);
    this.updateBusDisplay();
  }

  /**
   * 设置巴士状态
   * @param busId 巴士ID
   * @param status 状态
   */
  setBusStatus(busId: string, status: 'running' | 'stopped' | 'maintenance'): void {
    const bus = this.buses.get(busId);
    if (bus) {
      bus.status = status;
    }
  }

  /**
   * 获取巴士统计
   */
  getStatistics(): BusStatistics {
    return { ...this.statistics };
  }

  /**
   * 设置统计更新回调
   */
  setStatisticsUpdateCallback(callback: (stats: BusStatistics) => void): void {
    this.onStatisticsUpdate = callback;
  }

  /**
   * 获取所有穿梭巴士
   */
  getShuttleBuses(): ShuttleBus[] {
    return Array.from(this.buses.values());
  }

  /**
   * 获取所有巴士路线
   */
  getBusRoutes(): BusRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * 创建穿梭巴士
   */
  private createShuttleBuses(count: number): void {
    this.buses.clear();
    
    const routeIds = Array.from(this.routes.keys());
    
    for (let i = 0; i < count; i++) {
      const routeId = routeIds[i % routeIds.length];
      this.addShuttleBus(routeId);
    }
  }

  /**
   * 启动单个巴士动画
   */
  private startBusAnimation(bus: ShuttleBus): void {
    const route = this.routes.get(bus.routeId);
    if (!route) return;
    
    const animate = () => {
      if (!this.isRunning || bus.status !== 'running') {
        return;
      }
      
      // 计算速度
      const baseSpeed = 0.006; // 基础速度
      let speed = baseSpeed;
      
      // 根据路线类型调整速度
      if (route.id === 'route-loop') {
        speed *= 1.2; // 环线稍快
      }
      
      // 更新进度
      if (bus.direction === 'forward') {
        bus.progress += speed;
        if (bus.progress >= 1) {
          bus.progress = 1;
          bus.direction = 'backward';
          this.statistics.tripsCompleted++;
        }
      } else {
        bus.progress -= speed;
        if (bus.progress <= 0) {
          bus.progress = 0;
          bus.direction = 'forward';
          this.statistics.tripsCompleted++;
        }
      }
      
      // 更新位置
      bus.currentPosition = this.animationEngine.interpolatePath(route.points, bus.progress);
      
      // 更新下一站信息
      this.updateNextStop(bus, route);
      
      // 模拟乘客上下车
      this.simulatePassengerActivity(bus, route);
      
      // 继续动画
      const frameId = requestAnimationFrame(animate);
      this.animationFrames.set(bus.id, frameId);
    };
    
    animate();
  }

  /**
   * 更新下一站信息
   */
  private updateNextStop(bus: ShuttleBus, route: BusRoute): void {
    const totalStops = route.stops.length;
    let nextStopIndex: number;
    
    if (bus.direction === 'forward') {
      nextStopIndex = Math.floor(bus.progress * (totalStops - 1));
    } else {
      nextStopIndex = Math.ceil((1 - bus.progress) * (totalStops - 1));
    }
    
    nextStopIndex = Math.max(0, Math.min(totalStops - 1, nextStopIndex));
    bus.nextStop = route.stops[nextStopIndex].name;
    
    // 计算预计到达时间
    const remainingDistance = bus.direction === 'forward' 
      ? (nextStopIndex / (totalStops - 1)) - bus.progress
      : bus.progress - (nextStopIndex / (totalStops - 1));
    
    bus.estimatedArrival = Math.max(30, Math.round(Math.abs(remainingDistance) * route.duration * 60));
  }

  /**
   * 模拟乘客活动
   */
  private simulatePassengerActivity(bus: ShuttleBus, route: BusRoute): void {
    // 在站点附近时模拟乘客上下车
    const nearStop = this.isNearStop(bus, route);
    
    if (nearStop && Math.random() < 0.1) { // 10%概率发生乘客活动
      const change = Math.floor(Math.random() * 6) - 3; // -3到+3的变化
      bus.passengers = Math.max(0, Math.min(bus.capacity, bus.passengers + change));
    }
  }

  /**
   * 检查是否靠近站点
   */
  private isNearStop(bus: ShuttleBus, route: BusRoute): boolean {
    const stopThreshold = 0.05; // 5%的路程范围内算作靠近站点
    
    for (const stop of route.stops) {
      const stopPosition = this.findStopPosition(stop.position, route.points);
      if (Math.abs(bus.progress - stopPosition) < stopThreshold) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 查找站点在路线中的位置
   */
  private findStopPosition(stopPos: [number, number], routePoints: [number, number][]): number {
    let minDistance = Infinity;
    let closestIndex = 0;
    
    routePoints.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(point[0] - stopPos[0], 2) + Math.pow(point[1] - stopPos[1], 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    return closestIndex / (routePoints.length - 1);
  }

  /**
   * 更新巴士显示
   */
  private updateBusDisplay(): void {
    const features = Array.from(this.buses.values())
      .filter(bus => bus.status === 'running')
      .map(bus => ({
        type: 'Feature' as const,
        properties: {
          id: bus.id,
          busId: bus.id.split('-')[1], // 简化显示ID
          direction: bus.direction,
          passengers: bus.passengers,
          capacity: bus.capacity,
          nextStop: bus.nextStop,
          eta: bus.estimatedArrival
        },
        geometry: {
          type: 'Point' as const,
          coordinates: bus.currentPosition
        }
      }));
    
    const busData: BusData = {
      type: 'FeatureCollection',
      features
    };
    
    this.layerManager.updateLayerData('bus-src', busData);
  }

  /**
   * 启动统计更新
   */
  private startStatisticsUpdate(): void {
    const updateStats = () => {
      if (!this.isRunning) return;
      
      // 更新统计数据
      this.statistics.totalBuses = this.buses.size;
      this.statistics.activeBuses = Array.from(this.buses.values())
        .filter(bus => bus.status === 'running').length;
      
      this.statistics.totalPassengers = Array.from(this.buses.values())
        .reduce((sum, bus) => sum + bus.passengers, 0);
      
      // 计算平均等车时间（模拟）
      const elapsed = (Date.now() - this.startTime) / 1000 / 60;
      this.statistics.averageWaitTime = Math.round(3 + Math.sin(elapsed / 10) * 2); // 3±2分钟
      
      // 计算准点率（模拟）
      this.statistics.onTimePerformance = Math.round(85 + Math.sin(elapsed / 15) * 10); // 85±10%
      
      // 更新显示
      this.updateBusDisplay();
      
      // 调用回调
      if (this.onStatisticsUpdate) {
        this.onStatisticsUpdate(this.statistics);
      }
      
      globalTimerManager.setTimeout('bus-stats-update', updateStats, 2000); // 每2秒更新
    };
    
    updateStats();
  }

  /**
   * 初始化统计数据
   */
  private initializeStatistics(): BusStatistics {
    return {
      totalBuses: 0,
      activeBuses: 0,
      totalPassengers: 0,
      tripsCompleted: 0,
      averageWaitTime: 5,
      onTimePerformance: 90
    };
  }

  /**
   * 检查系统是否运行中
   */
  isSystemRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 销毁穿梭巴士系统
   */
  destroy(): void {
    this.stopBusSystem();
    this.buses.clear();
    this.routes.clear();
    this.onStatisticsUpdate = undefined;
  }
}

export default ShuttleBusSystem;