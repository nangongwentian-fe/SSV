import { LayerManager } from '../lib/LayerManager';
import { WeatherSignalSystem, WeatherSignal } from './WeatherSignalSystem';
import { DataSimulationService } from './DataSimulationService';
import { AnimationEngine } from './AnimationEngine';
import { CrowdFlowSimulator } from './CrowdFlowSimulator';
import { PatrolAnimationSystem } from './PatrolAnimationSystem';
import { ShuttleBusSystem } from './ShuttleBusSystem';

export enum ScenarioMode {
  NORMAL = 'normal',
  DEMO = 'demo',
  CONCERT = 'concert',
  TYPHOON = 'typhoon'
}

export interface ScenarioConfig {
  mode: ScenarioMode;
  layers: string[];
  animations: {
    crowdFlow: boolean;
    patrol: boolean;
    shuttleBus: boolean;
  };
  dataSimulation: {
    kpi: boolean;
    elevator: boolean;
    anpr: boolean;
  };
  weatherSignal?: WeatherSignal;
}

export class ScenarioManager {
  private currentMode: ScenarioMode = ScenarioMode.NORMAL;
  private layerManager: LayerManager | null = null;
  private animationEngine: AnimationEngine | null = null;
  private crowdFlowSimulator: CrowdFlowSimulator | null = null;
  private patrolSystem: PatrolAnimationSystem | null = null;
  private shuttleBusSystem: ShuttleBusSystem | null = null;
  private weatherSignalSystem: WeatherSignalSystem | null = null;
  private dataSimulationService: DataSimulationService | null = null;
  private onModeChange?: (mode: ScenarioMode) => void;
  private scenarioConfigs: Record<ScenarioMode, ScenarioConfig> = {
    [ScenarioMode.NORMAL]: {
      mode: ScenarioMode.NORMAL,
      layers: ['buildings', 'roads'],
      animations: {
        crowdFlow: false,
        patrol: false,
        shuttleBus: false
      },
      dataSimulation: {
        kpi: true,
        elevator: true,
        anpr: true
      }
    },
    [ScenarioMode.DEMO]: {
      mode: ScenarioMode.DEMO,
      layers: ['buildings', 'roads', 'sensors', 'cameras'],
      animations: {
        crowdFlow: true,
        patrol: true,
        shuttleBus: true
      },
      dataSimulation: {
        kpi: true,
        elevator: true,
        anpr: true
      }
    },
    [ScenarioMode.CONCERT]: {
      mode: ScenarioMode.CONCERT,
      layers: ['buildings', 'roads', 'crowd-flow', 'transport'],
      animations: {
        crowdFlow: true,
        patrol: true,
        shuttleBus: true
      },
      dataSimulation: {
        kpi: true,
        elevator: true,
        anpr: true
      }
    },
    [ScenarioMode.TYPHOON]: {
      mode: ScenarioMode.TYPHOON,
      layers: ['buildings', 'roads', 'flood-risk', 'emergency'],
      animations: {
        crowdFlow: false,
        patrol: true,
        shuttleBus: false
      },
      dataSimulation: {
        kpi: true,
        elevator: false,
        anpr: true
      },
      weatherSignal: WeatherSignal.T8
    }
  };

  constructor() {
    // 配置已在属性声明时初始化
  }

  private initializeScenarioConfigs() {
    // 配置已在属性声明时初始化，此方法保留以备将来使用
    console.log('Scenario configs initialized');
  }

  // 设置依赖项
  setLayerManager(layerManager: LayerManager) {
    this.layerManager = layerManager;
  }

  setAnimationEngine(animationEngine: AnimationEngine) {
    this.animationEngine = animationEngine;
  }

  setCrowdFlowSimulator(crowdFlowSimulator: CrowdFlowSimulator) {
    this.crowdFlowSimulator = crowdFlowSimulator;
  }

  setPatrolSystem(patrolSystem: PatrolAnimationSystem) {
    this.patrolSystem = patrolSystem;
  }

  setShuttleBusSystem(shuttleBusSystem: ShuttleBusSystem) {
    this.shuttleBusSystem = shuttleBusSystem;
  }

  setDataSimulationService(dataSimulationService: DataSimulationService) {
    this.dataSimulationService = dataSimulationService;
  }

  setWeatherSignalSystem(weatherSignalSystem: WeatherSignalSystem): void {
    this.weatherSignalSystem = weatherSignalSystem;
  }

  setOnModeChange(callback: (mode: ScenarioMode) => void) {
    this.onModeChange = callback;
  }

  // 获取当前模式
  getCurrentMode(): ScenarioMode {
    return this.currentMode;
  }

  // 获取场景配置
  getScenarioConfig(mode: ScenarioMode): ScenarioConfig {
    return this.scenarioConfigs[mode];
  }

  // 激活演示模式
  async activateDemoMode(): Promise<void> {
    console.log('ScenarioManager: 激活演示模式开始');
    try {
      await this.switchToMode(ScenarioMode.DEMO);
      console.log('ScenarioManager: 演示模式激活完成');
    } catch (error) {
      console.error('ScenarioManager: 激活演示模式失败:', error);
      throw error;
    }
  }

  // 激活演唱会模式
  async activateConcertMode(): Promise<void> {
    console.log('激活演唱会模式');
    await this.switchToMode(ScenarioMode.CONCERT);
  }

  // 激活台风模式
  async activateTyphoonMode(): Promise<void> {
    console.log('激活T8台风模式');
    await this.switchToMode(ScenarioMode.TYPHOON);
  }

  // 重置为正常模式
  async resetToNormalMode(): Promise<void> {
    console.log('重置为正常模式');
    await this.switchToMode(ScenarioMode.NORMAL);
  }

  // 切换到指定模式
  async switchToMode(mode: ScenarioMode): Promise<void> {
    if (this.currentMode === mode) {
      console.log(`ScenarioManager: 已经处于${mode}模式`);
      return;
    }

    console.log(`ScenarioManager: 切换到${mode}模式`);
    this.currentMode = mode;

    // 停止所有动画
    console.log('ScenarioManager: 停止所有动画');
    this.stopAllAnimations();

    // 更新图层显示
    console.log('ScenarioManager: 更新图层显示');
    this.updateLayerVisibility(mode);

    // 更新数据模拟
    console.log('ScenarioManager: 更新数据模拟');
    this.updateDataSimulation(mode);

    // 启动动画
    console.log('ScenarioManager: 启动动画');
    await this.updateAnimations(mode);

    // 触发回调
    console.log('ScenarioManager: 触发模式变更回调');
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
    
    console.log(`ScenarioManager: ${mode}模式切换完成`);
  }

  // 停止所有动画
  private async stopAllAnimations(): Promise<void> {
    if (this.crowdFlowSimulator) {
      this.crowdFlowSimulator.stopSimulation();
    }
    if (this.patrolSystem) {
      this.patrolSystem.stopPatrolSystem();
    }
    if (this.shuttleBusSystem) {
      this.shuttleBusSystem.stopBusSystem();
    }
  }

  // 更新图层显示
  private updateLayerVisibility(mode: ScenarioMode): void {
    if (!this.layerManager) return;
    
    // 获取所有实际的图层ID
    const allLayerIds = [
      'sensors-layer', 'cctv-layer', 'heat-layer', 'bus-layer', 
      'flow-layer', 'fence-layer', 'iaq-layer', 'bins-layer', 
      'flood-layer', 'patrol-layer'
    ];
    
    // 根据新模式决定图层显示策略
     if (mode === ScenarioMode.TYPHOON) {
       // T8模式：显示内涝风险图层，隐藏活动相关图层
       if (!this.layerManager.getLayerVisibility('flood-layer')) {
         this.layerManager.toggleLayerVisibility('flood-layer');
       }
      
      // 隐藏活动联动相关图层
      const activityLayers = ['flow-layer', 'heat-layer'];
      for (const layerId of activityLayers) {
        if (this.layerManager.getLayerVisibility(layerId)) {
          this.layerManager.toggleLayerVisibility(layerId);
        }
      }
      
      // 确保基础设施图层可见
      const infrastructureLayers = ['sensors-layer', 'cctv-layer', 'patrol-layer'];
      for (const layerId of infrastructureLayers) {
        if (!this.layerManager.getLayerVisibility(layerId)) {
          this.layerManager.toggleLayerVisibility(layerId);
        }
      }
    } else if (mode === ScenarioMode.CONCERT) {
      // 演唱会模式：显示人流相关图层
      const concertLayers = ['flow-layer', 'heat-layer', 'bus-layer', 'patrol-layer'];
      for (const layerId of concertLayers) {
        if (!this.layerManager.getLayerVisibility(layerId)) {
          this.layerManager.toggleLayerVisibility(layerId);
        }
      }
      
      // 隐藏内涝风险图层
      if (this.layerManager.getLayerVisibility('flood-layer')) {
        this.layerManager.toggleLayerVisibility('flood-layer');
      }
    } else if (mode === ScenarioMode.DEMO) {
      // 演示模式：显示所有主要图层
      const demoLayers = ['sensors-layer', 'cctv-layer', 'heat-layer', 'bus-layer', 'patrol-layer'];
      for (const layerId of demoLayers) {
        if (!this.layerManager.getLayerVisibility(layerId)) {
          this.layerManager.toggleLayerVisibility(layerId);
        }
      }
    } else {
      // 正常模式：显示基础图层
      const normalLayers = ['sensors-layer', 'cctv-layer', 'iaq-layer', 'bins-layer'];
      for (const layerId of normalLayers) {
        if (!this.layerManager.getLayerVisibility(layerId)) {
          this.layerManager.toggleLayerVisibility(layerId);
        }
      }
      
      // 隐藏特殊场景图层
      const specialLayers = ['flow-layer', 'heat-layer', 'flood-layer'];
      for (const layerId of specialLayers) {
        if (this.layerManager.getLayerVisibility(layerId)) {
          this.layerManager.toggleLayerVisibility(layerId);
        }
      }
    }
  }

  // 更新数据模拟
  private updateDataSimulation(mode: ScenarioMode): void {
    console.log(`更新数据模拟: ${mode}`);
    
    if (!this.dataSimulationService) {
      console.warn('DataSimulationService 未初始化');
      return;
    }
    
    // 根据场景模式启动不同的数据模拟
    switch (mode) {
      case ScenarioMode.DEMO:
        this.dataSimulationService.startKPISimulation();
        this.dataSimulationService.startElevatorSimulation();
        this.dataSimulationService.startANPRSimulation();
        break;
        
      case ScenarioMode.CONCERT:
        this.dataSimulationService.startKPISimulation();
        this.dataSimulationService.startElevatorSimulation();
        this.dataSimulationService.stopANPRSimulation(); // 演唱会模式不需要车辆监控
        break;
        
      case ScenarioMode.TYPHOON:
        this.dataSimulationService.stopKPISimulation(); // 台风模式下停止常规KPI
        this.dataSimulationService.startElevatorSimulation(); // 保持电梯监控
        this.dataSimulationService.stopANPRSimulation(); // 停止车辆监控
        break;
        
      case ScenarioMode.NORMAL:
      default:
        this.dataSimulationService.stopKPISimulation();
        this.dataSimulationService.stopElevatorSimulation();
        this.dataSimulationService.stopANPRSimulation();
        break;
    }
  }

  // 更新动画
  private async updateAnimations(mode: ScenarioMode): Promise<void> {
    console.log(`ScenarioManager: updateAnimations for mode ${mode}`);
    
    const config = this.scenarioConfigs[mode];
    
    switch (mode) {
      case ScenarioMode.DEMO:
      case ScenarioMode.CONCERT:
        console.log('ScenarioManager: 启动演示/演唱会模式动画');
        
        // 启动人流动画
        if (config.animations.crowdFlow && this.crowdFlowSimulator) {
          console.log('ScenarioManager: 启动人流动画');
          try {
            await this.crowdFlowSimulator.startSimulation();
            console.log('ScenarioManager: 人流动画启动成功');
          } catch (error) {
            console.error('ScenarioManager: 人流动画启动失败:', error);
          }
        } else if (config.animations.crowdFlow) {
          console.warn('ScenarioManager: crowdFlowSimulator 未初始化');
        }
        
        // 启动巡逻动画
        if (config.animations.patrol && this.patrolSystem) {
          console.log('ScenarioManager: 启动巡逻动画');
          try {
            this.patrolSystem.startPatrolSystem();
            console.log('ScenarioManager: 巡逻动画启动成功');
          } catch (error) {
            console.error('ScenarioManager: 巡逻动画启动失败:', error);
          }
        } else if (config.animations.patrol) {
          console.warn('ScenarioManager: patrolSystem 未初始化');
        }
        
        // 启动穿梭巴士动画
        if (config.animations.shuttleBus && this.shuttleBusSystem) {
          console.log('ScenarioManager: 启动穿梭巴士动画');
          try {
            this.shuttleBusSystem.startBusSystem();
            console.log('ScenarioManager: 穿梭巴士动画启动成功');
          } catch (error) {
            console.error('ScenarioManager: 穿梭巴士动画启动失败:', error);
          }
        } else if (config.animations.shuttleBus) {
          console.warn('ScenarioManager: shuttleBusSystem 未初始化');
        }
        break;
        
      case ScenarioMode.TYPHOON:
        console.log('ScenarioManager: 启动台风模式动画');
        // 台风模式下只启动紧急巡逻
        if (config.animations.patrol && this.patrolSystem) {
          console.log('ScenarioManager: 启动紧急巡逻');
          this.patrolSystem.startPatrolSystem();
        } else if (config.animations.patrol) {
          console.warn('ScenarioManager: patrolSystem 未初始化');
        }
        break;
        
      case ScenarioMode.NORMAL:
      default:
        console.log('ScenarioManager: 正常模式不启动动画');
        break;
    }
    
    console.log(`ScenarioManager: updateAnimations 完成 for mode ${mode}`);
  }

  // 清理资源
  cleanup(): void {
    console.log('清理场景管理器');
    
    // 停止所有动画
    if (this.animationEngine) {
      this.animationEngine.stopAllAnimations();
    }
    
    // 停止数据模拟
    if (this.dataSimulationService) {
      this.dataSimulationService.cleanup();
    }
    
    // 重置到正常模式
    this.resetToNormalMode();
    
    // 清理回调
    this.onModeChange = undefined;
  }
}