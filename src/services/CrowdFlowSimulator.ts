import { AnimationEngine, FlowData } from './AnimationEngine';
import { LayerManager } from '../lib/LayerManager';
import { globalTimerManager } from '../utils/TimerManager';

export interface CrowdFlowConfig {
  audienceCount: number; // 观众数量（千人）
  exitSpeed: number; // 散场速度倍数
  distribution: {
    mtr: number; // MTR分流比例
    taxi: number; // 出租车分流比例
    runway: number; // Runway分流比例
  };
}

export interface FlowStatistics {
  total: number;
  mtr: number;
  taxi: number;
  runway: number;
  completed: number;
  inProgress: number;
  estimatedTime: number; // 预计完成时间（分钟）
}

export class CrowdFlowSimulator {
  private animationEngine: AnimationEngine;
  private layerManager: LayerManager;
  private isSimulating: boolean = false;
  private config: CrowdFlowConfig;
  private statistics: FlowStatistics;
  private startTime: number = 0;
  private onStatisticsUpdate?: (stats: FlowStatistics) => void;

  // 预定义散场路线
  private exitRoutes = {
    // 主要出口到MTR（启德站）
    toMTR: [
      [114.19733, 22.32235], // KTSP主出口
      [114.1985, 22.3245], // 中转点1
      [114.2006, 22.3297], // 中转点2
      [114.1994, 22.3304] // 启德站
    ] as [number, number][],
    
    // 主要出口到出租车站
    toTaxi: [
      [114.19733, 22.32235], // KTSP主出口
      [114.2015, 22.3275], // 中转点1
      [114.2021, 22.3292], // 中转点2
      [114.2027, 22.3293] // Mall 2出租车站
    ] as [number, number][],
    
    // 主要出口到Runway 1331
    toRunway: [
      [114.19733, 22.32235], // KTSP主出口
      [114.2025, 22.3235], // 中转点1
      [114.2055, 22.3245], // 中转点2
      [114.2095, 22.3155], // 中转点3
      [114.2128, 22.3074] // Runway 1331
    ] as [number, number][],
    
    // 次要出口路线（分散人流）
    secondaryToMTR: [
      [114.1965, 22.3215], // 次要出口
      [114.1975, 22.3285],
      [114.1994, 22.3304]
    ] as [number, number][],
    
    secondaryToTaxi: [
      [114.1965, 22.3215], // 次要出口
      [114.2005, 22.3265],
      [114.2027, 22.3293]
    ] as [number, number][]
  };

  constructor(animationEngine: AnimationEngine, layerManager: LayerManager) {
    this.animationEngine = animationEngine;
    this.layerManager = layerManager;
    
    // 默认配置
    this.config = {
      audienceCount: 55, // 5.5万人
      exitSpeed: 1.0,
      distribution: {
        mtr: 0.60, // 60%去MTR
        taxi: 0.25, // 25%去出租车
        runway: 0.15 // 15%去Runway
      }
    };
    
    this.statistics = this.initializeStatistics();
  }

  /**
   * 开始散场模拟
   * @param config 散场配置
   */
  startSimulation(config?: Partial<CrowdFlowConfig>): void {
    if (this.isSimulating) {
      this.stopSimulation();
    }

    // 更新配置
    this.config = { ...this.config, ...config };
    this.statistics = this.initializeStatistics();
    this.startTime = Date.now();
    this.isSimulating = true;

    // 生成人流数据
    const flowData = this.generateCrowdFlowData();
    
    // 启动动画
    this.startFlowAnimation(flowData);
    
    // 启动统计更新
    this.startStatisticsUpdate();
    
    console.log('散场模拟已启动', {
      观众数量: `${this.config.audienceCount}千人`,
      分流情况: this.config.distribution,
      预计完成时间: `${this.statistics.estimatedTime}分钟`
    });
  }

  /**
   * 停止散场模拟
   */
  stopSimulation(): void {
    if (!this.isSimulating) return;
    
    this.isSimulating = false;
    this.animationEngine.stopAnimation('crowd-flow');
    
    // 清空人流图层
    this.layerManager.updateLayerData('flow-src', {
      type: 'FeatureCollection',
      features: []
    });
    
    console.log('散场模拟已停止');
  }

  /**
   * 设置统计更新回调
   * @param callback 回调函数
   */
  setStatisticsUpdateCallback(callback: (stats: FlowStatistics) => void): void {
    this.onStatisticsUpdate = callback;
  }

  /**
   * 获取当前统计数据
   */
  getStatistics(): FlowStatistics {
    return { ...this.statistics };
  }

  /**
   * 检查是否正在模拟
   */
  isRunning(): boolean {
    return this.isSimulating;
  }

  /**
   * 更新散场速度
   * @param speedMultiplier 速度倍数
   */
  updateExitSpeed(speedMultiplier: number): void {
    this.config.exitSpeed = Math.max(0.1, Math.min(5.0, speedMultiplier));
  }

  /**
   * 生成人群流动数据
   */
  private generateCrowdFlowData(): FlowData {
    const total = this.config.audienceCount * 1000;
    const features = [];
    
    // 计算各路线人数
    const counts = {
      mtr: Math.round(total * this.config.distribution.mtr),
      taxi: Math.round(total * this.config.distribution.taxi),
      runway: Math.round(total * this.config.distribution.runway)
    };
    
    // 控制显示密度（避免性能问题）
    const displayDensity = 0.02; // 显示2%的人流
    
    // 生成MTR路线人流（主要+次要）
    const mtrDisplay = Math.round(counts.mtr * displayDensity);
    const mtrMain = Math.round(mtrDisplay * 0.7);
    const mtrSecondary = mtrDisplay - mtrMain;
    
    // 主要MTR路线
    for (let i = 0; i < mtrMain; i++) {
      features.push(this.createFlowFeature(
        `mtr-main-${i}`,
        this.exitRoutes.toMTR,
        'MTR',
        0.008 + Math.random() * 0.006
      ));
    }
    
    // 次要MTR路线
    for (let i = 0; i < mtrSecondary; i++) {
      features.push(this.createFlowFeature(
        `mtr-sec-${i}`,
        this.exitRoutes.secondaryToMTR,
        'MTR',
        0.007 + Math.random() * 0.005
      ));
    }
    
    // 生成出租车路线人流
    const taxiDisplay = Math.round(counts.taxi * displayDensity);
    const taxiMain = Math.round(taxiDisplay * 0.8);
    const taxiSecondary = taxiDisplay - taxiMain;
    
    for (let i = 0; i < taxiMain; i++) {
      features.push(this.createFlowFeature(
        `taxi-main-${i}`,
        this.exitRoutes.toTaxi,
        'Taxi',
        0.009 + Math.random() * 0.007
      ));
    }
    
    for (let i = 0; i < taxiSecondary; i++) {
      features.push(this.createFlowFeature(
        `taxi-sec-${i}`,
        this.exitRoutes.secondaryToTaxi,
        'Taxi',
        0.008 + Math.random() * 0.006
      ));
    }
    
    // 生成Runway路线人流
    const runwayDisplay = Math.round(counts.runway * displayDensity);
    for (let i = 0; i < runwayDisplay; i++) {
      features.push(this.createFlowFeature(
        `runway-${i}`,
        this.exitRoutes.toRunway,
        'Runway',
        0.006 + Math.random() * 0.004
      ));
    }
    
    return { type: 'FeatureCollection', features };
  }

  /**
   * 创建人流特征
   */
  private createFlowFeature(
    id: string,
    path: [number, number][],
    destination: 'MTR' | 'Taxi' | 'Runway',
    baseSpeed: number
  ) {
    return {
      type: 'Feature' as const,
      properties: {
        id,
        path: JSON.stringify(path),
        t: Math.random() * 0.1, // 随机起始位置
        speed: baseSpeed * this.config.exitSpeed,
        destination
      },
      geometry: {
        type: 'Point' as const,
        coordinates: path[0] as [number, number]
      }
    };
  }

  /**
   * 启动人流动画
   */
  private startFlowAnimation(flowData: FlowData): void {
    const animate = () => {
      if (!this.isSimulating) return;
      
      let completed = 0;
      
      flowData.features.forEach(feature => {
        const props = feature.properties;
        props.t += props.speed;
        
        if (props.t >= 1) {
          completed++;
          props.t = 0; // 重新开始（模拟持续散场）
        }
        
        const path = JSON.parse(props.path);
        feature.geometry.coordinates = this.animationEngine.interpolatePath(path, props.t);
      });
      
      // 更新统计
      this.statistics.completed += completed;
      this.statistics.inProgress = flowData.features.length - completed;
      
      this.layerManager.updateLayerData('flow-src', flowData);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * 启动统计更新
   */
  private startStatisticsUpdate(): void {
    const updateStats = () => {
      if (!this.isSimulating) return;
      
      const elapsed = (Date.now() - this.startTime) / 1000 / 60; // 分钟
      const progress = Math.min(elapsed / this.statistics.estimatedTime, 1);
      
      // 更新完成数量（基于时间进度）
      const totalPeople = this.config.audienceCount * 1000;
      this.statistics.completed = Math.round(totalPeople * progress);
      this.statistics.inProgress = totalPeople - this.statistics.completed;
      
      // 更新各路线统计
      this.statistics.mtr = Math.round(this.statistics.completed * this.config.distribution.mtr);
      this.statistics.taxi = Math.round(this.statistics.completed * this.config.distribution.taxi);
      this.statistics.runway = Math.round(this.statistics.completed * this.config.distribution.runway);
      
      // 调用回调
      if (this.onStatisticsUpdate) {
        this.onStatisticsUpdate(this.statistics);
      }
      
      // 检查是否完成
      if (progress >= 1) {
        console.log('散场模拟完成');
        this.stopSimulation();
        return;
      }
      
      globalTimerManager.setTimeout('crowd-flow-stats-update', updateStats, 2000); // 每2秒更新一次
    };
    
    updateStats();
  }

  /**
   * 初始化统计数据
   */
  private initializeStatistics(): FlowStatistics {
    const total = this.config.audienceCount * 1000;
    
    return {
      total,
      mtr: 0,
      taxi: 0,
      runway: 0,
      completed: 0,
      inProgress: total,
      estimatedTime: this.calculateEstimatedTime()
    };
  }

  /**
   * 计算预计完成时间
   */
  private calculateEstimatedTime(): number {
    // 基于观众数量和出口容量计算
    const baseTime = this.config.audienceCount / 10; // 基础时间（分钟）
    const speedFactor = 1 / this.config.exitSpeed;
    return Math.round(baseTime * speedFactor);
  }

  /**
   * 销毁模拟器
   */
  destroy(): void {
    this.stopSimulation();
    this.onStatisticsUpdate = undefined;
  }
}

export default CrowdFlowSimulator;