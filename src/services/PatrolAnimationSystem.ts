import { AnimationEngine, PatrolData } from './AnimationEngine';
import { LayerManager } from '../lib/LayerManager';
import { globalTimerManager } from '../utils/TimerManager';

export interface PatrolRoute {
  id: string;
  name: string;
  points: [number, number][];
  duration: number; // 巡逻周期（分钟）
  priority: 'high' | 'medium' | 'low';
}

export interface PatrolOfficer {
  id: string;
  name: string;
  routeId: string;
  status: 'active' | 'break' | 'emergency';
  currentPosition: [number, number];
  progress: number; // 0-1
  lastCheckpoint: string;
  nextCheckpoint: string;
}

export interface PatrolStatistics {
  totalOfficers: number;
  activeOfficers: number;
  completedRounds: number;
  averageResponseTime: number; // 秒
  coveragePercentage: number;
}

export class PatrolAnimationSystem {
  private animationEngine: AnimationEngine;
  private layerManager: LayerManager;
  private isRunning: boolean = false;
  private officers: Map<string, PatrolOfficer> = new Map();
  private routes: Map<string, PatrolRoute> = new Map();
  private animationFrames: Map<string, number> = new Map();
  private statistics: PatrolStatistics;
  private onStatisticsUpdate?: (stats: PatrolStatistics) => void;
  private startTime: number = 0;

  // 预定义巡更路线
  private predefinedRoutes: PatrolRoute[] = [
    {
      id: 'route-perimeter',
      name: '外围巡逻',
      points: [
        [114.2126, 22.3098], // 起点：主入口
        [114.2148, 22.3099], // 东侧
        [114.2154, 22.3075], // 东南角
        [114.2135, 22.3055], // 南侧
        [114.2114, 22.3057], // 西南角
        [114.2100, 22.3088], // 西侧
        [114.2110, 22.3105], // 西北角
        [114.2126, 22.3098]  // 回到起点
      ],
      duration: 15, // 15分钟一圈
      priority: 'high'
    },
    {
      id: 'route-internal',
      name: '内部巡逻',
      points: [
        [114.2120, 22.3085], // 内部起点
        [114.2135, 22.3090], // 中央区域
        [114.2140, 22.3080], // 东内侧
        [114.2130, 22.3070], // 南内侧
        [114.2115, 22.3075], // 西内侧
        [114.2120, 22.3085]  // 回到起点
      ],
      duration: 10, // 10分钟一圈
      priority: 'medium'
    },
    {
      id: 'route-parking',
      name: '停车场巡逻',
      points: [
        [114.2090, 22.3095], // 停车场入口
        [114.2095, 22.3105], // 北区
        [114.2105, 22.3110], // 东北区
        [114.2110, 22.3100], // 东区
        [114.2100, 22.3090], // 南区
        [114.2090, 22.3095]  // 回到入口
      ],
      duration: 8, // 8分钟一圈
      priority: 'medium'
    },
    {
      id: 'route-emergency',
      name: '应急巡逻',
      points: [
        [114.2125, 22.3095], // 应急起点
        [114.2140, 22.3095], // 快速东向
        [114.2145, 22.3080], // 快速南向
        [114.2130, 22.3065], // 快速西向
        [114.2115, 22.3080], // 快速北向
        [114.2125, 22.3095]  // 回到起点
      ],
      duration: 5, // 5分钟快速巡逻
      priority: 'high'
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
   * 启动巡更系统
   * @param officerCount 巡逻人员数量
   */
  startPatrolSystem(officerCount: number = 4): void {
    if (this.isRunning) {
      this.stopPatrolSystem();
    }

    this.isRunning = true;
    this.startTime = Date.now();
    
    // 创建巡逻人员
    this.createPatrolOfficers(officerCount);
    
    // 启动所有巡逻动画
    this.officers.forEach(officer => {
      this.startOfficerAnimation(officer);
    });
    
    // 启动统计更新
    this.startStatisticsUpdate();
    
    console.log(`巡更系统已启动，${officerCount}名安保人员开始巡逻`);
  }

  /**
   * 停止巡更系统
   */
  stopPatrolSystem(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // 停止所有动画
    this.animationFrames.forEach((frameId, officerId) => {
      cancelAnimationFrame(frameId);
    });
    this.animationFrames.clear();
    
    // 清空巡逻图层
    this.layerManager.updateLayerData('patrol-src', {
      type: 'FeatureCollection',
      features: []
    });
    
    console.log('巡更系统已停止');
  }

  /**
   * 添加巡逻人员
   * @param routeId 路线ID
   * @param officerName 人员姓名
   */
  addPatrolOfficer(routeId: string, officerName: string): string {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error(`路线 ${routeId} 不存在`);
    }

    const officerId = `officer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const officer: PatrolOfficer = {
      id: officerId,
      name: officerName,
      routeId,
      status: 'active',
      currentPosition: route.points[0],
      progress: 0,
      lastCheckpoint: 'start',
      nextCheckpoint: 'checkpoint-1'
    };
    
    this.officers.set(officerId, officer);
    
    if (this.isRunning) {
      this.startOfficerAnimation(officer);
    }
    
    return officerId;
  }

  /**
   * 移除巡逻人员
   * @param officerId 人员ID
   */
  removePatrolOfficer(officerId: string): void {
    const frameId = this.animationFrames.get(officerId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(officerId);
    }
    
    this.officers.delete(officerId);
    this.updatePatrolDisplay();
  }

  /**
   * 设置人员状态
   * @param officerId 人员ID
   * @param status 状态
   */
  setOfficerStatus(officerId: string, status: 'active' | 'break' | 'emergency'): void {
    const officer = this.officers.get(officerId);
    if (officer) {
      officer.status = status;
      
      if (status === 'emergency') {
        // 切换到应急巡逻路线
        officer.routeId = 'route-emergency';
        officer.progress = 0;
      }
    }
  }

  /**
   * 获取巡逻统计
   */
  getStatistics(): PatrolStatistics {
    return { ...this.statistics };
  }

  /**
   * 设置统计更新回调
   */
  setStatisticsUpdateCallback(callback: (stats: PatrolStatistics) => void): void {
    this.onStatisticsUpdate = callback;
  }

  /**
   * 获取所有巡逻人员
   */
  getPatrolOfficers(): PatrolOfficer[] {
    return Array.from(this.officers.values());
  }

  /**
   * 获取所有巡逻路线
   */
  getPatrolRoutes(): PatrolRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * 创建巡逻人员
   */
  private createPatrolOfficers(count: number): void {
    this.officers.clear();
    
    const routeIds = Array.from(this.routes.keys());
    
    for (let i = 0; i < count; i++) {
      const routeId = routeIds[i % routeIds.length];
      const officerName = `安保${String.fromCharCode(65 + i)}`; // A, B, C, D...
      
      this.addPatrolOfficer(routeId, officerName);
    }
  }

  /**
   * 启动单个人员动画
   */
  private startOfficerAnimation(officer: PatrolOfficer): void {
    const route = this.routes.get(officer.routeId);
    if (!route) return;
    
    const animate = () => {
      if (!this.isRunning || officer.status === 'break') {
        return;
      }
      
      // 计算速度（基于路线优先级和状态）
      let speed = 0.008; // 基础速度
      
      if (officer.status === 'emergency') {
        speed *= 2; // 应急状态加速
      }
      
      if (route.priority === 'high') {
        speed *= 1.2;
      } else if (route.priority === 'low') {
        speed *= 0.8;
      }
      
      // 更新进度
      officer.progress += speed;
      
      // 检查是否完成一圈
      if (officer.progress >= 1) {
        officer.progress = 0;
        this.statistics.completedRounds++;
      }
      
      // 更新位置
      officer.currentPosition = this.animationEngine.interpolatePath(route.points, officer.progress);
      
      // 更新检查点
      this.updateCheckpoints(officer, route);
      
      // 继续动画
      const frameId = requestAnimationFrame(animate);
      this.animationFrames.set(officer.id, frameId);
    };
    
    animate();
  }

  /**
   * 更新检查点信息
   */
  private updateCheckpoints(officer: PatrolOfficer, route: PatrolRoute): void {
    const totalCheckpoints = route.points.length - 1;
    const currentCheckpoint = Math.floor(officer.progress * totalCheckpoints);
    
    officer.lastCheckpoint = `checkpoint-${currentCheckpoint}`;
    officer.nextCheckpoint = `checkpoint-${(currentCheckpoint + 1) % totalCheckpoints}`;
  }

  /**
   * 更新巡逻显示
   */
  private updatePatrolDisplay(): void {
    const features = Array.from(this.officers.values())
      .filter(officer => officer.status === 'active' || officer.status === 'emergency')
      .map(officer => ({
        type: 'Feature' as const,
        properties: {
          id: officer.id,
          patrolId: officer.name,
          status: officer.status,
          routeId: officer.routeId,
          progress: Math.round(officer.progress * 100)
        },
        geometry: {
          type: 'Point' as const,
          coordinates: officer.currentPosition
        }
      }));
    
    const patrolData: PatrolData = {
      type: 'FeatureCollection',
      features
    };
    
    this.layerManager.updateLayerData('patrol-src', patrolData);
  }

  /**
   * 启动统计更新
   */
  private startStatisticsUpdate(): void {
    const updateStats = () => {
      if (!this.isRunning) return;
      
      // 更新统计数据
      this.statistics.totalOfficers = this.officers.size;
      this.statistics.activeOfficers = Array.from(this.officers.values())
        .filter(officer => officer.status === 'active' || officer.status === 'emergency').length;
      
      // 计算覆盖率
      const totalRoutes = this.routes.size;
      const coveredRoutes = new Set(Array.from(this.officers.values()).map(o => o.routeId)).size;
      this.statistics.coveragePercentage = Math.round((coveredRoutes / totalRoutes) * 100);
      
      // 计算平均响应时间（模拟）
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.statistics.averageResponseTime = Math.round(30 + Math.sin(elapsed / 60) * 10); // 30±10秒
      
      // 更新显示
      this.updatePatrolDisplay();
      
      // 调用回调
      if (this.onStatisticsUpdate) {
        this.onStatisticsUpdate(this.statistics);
      }
      
      globalTimerManager.setTimeout('patrol-stats-update', updateStats, 1000); // 每秒更新
    };
    
    updateStats();
  }

  /**
   * 初始化统计数据
   */
  private initializeStatistics(): PatrolStatistics {
    return {
      totalOfficers: 0,
      activeOfficers: 0,
      completedRounds: 0,
      averageResponseTime: 30,
      coveragePercentage: 0
    };
  }

  /**
   * 检查系统是否运行中
   */
  isSystemRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 销毁巡更系统
   */
  destroy(): void {
    this.stopPatrolSystem();
    this.officers.clear();
    this.routes.clear();
    this.onStatisticsUpdate = undefined;
  }
}

export default PatrolAnimationSystem;