import { create } from 'zustand';
import { MapState } from '../types';
import { AnimationEngine } from '../services/AnimationEngine';
import { CrowdFlowSimulator } from '../services/CrowdFlowSimulator';
import { PatrolAnimationSystem } from '../services/PatrolAnimationSystem';
import { ShuttleBusSystem } from '../services/ShuttleBusSystem';
import { ScenarioManager, ScenarioMode } from '../services/ScenarioManager';
import { WeatherSignalSystem, WeatherSignal, WeatherStats } from '../services/WeatherSignalSystem';
import { DataSimulationService } from '../services/DataSimulationService';
import { LayerManager } from '../lib/LayerManager';

interface AnimationState {
  isAnimationEngineActive: boolean;
  isCrowdFlowActive: boolean;
  isPatrolActive: boolean;
  isShuttleBusActive: boolean;
  animationStats: {
    fps: number;
    activeAnimations: number;
    memoryUsage: number;
  };
}

interface ScenarioState {
  currentMode: ScenarioMode;
  isTransitioning: boolean;
  lastModeChange: Date | null;
}

interface WeatherState {
  currentSignal: WeatherSignal;
  weatherStats: WeatherStats | null;
  isEmergencyActive: boolean;
  statistics?: {
    duration: number;
    affectedAreas: string[];
    signalChanges: number;
    emergencyResponses: number;
  };
}

interface UIState {
  drawerOpen: boolean;
  drawerActiveTab: string;
}

interface MapStore {
  mapState: MapState;
  animationState: AnimationState;
  scenarioState: ScenarioState;
  weatherState: WeatherState;
  uiState: UIState;
  layerManager: LayerManager | null;
  animationEngine: AnimationEngine | null;
  crowdFlowSimulator: CrowdFlowSimulator | null;
  patrolSystem: PatrolAnimationSystem | null;
  shuttleBusSystem: ShuttleBusSystem | null;
  scenarioManager: ScenarioManager | null;
  weatherSignalSystem: WeatherSignalSystem | null;
  dataSimulationService: DataSimulationService | null;
  
  // Map methods
  updateMapboxToken: (token: string) => void;
  updateTilesUrl: (url: string) => void;
  updateMapState: (state: Partial<MapState>) => void;
  
  // Layer methods
  setLayerManager: (layerManager: LayerManager) => void;
  
  // Animation methods
  initializeAnimationSystems: () => void;
  setAnimationEngine: (engine: AnimationEngine) => void;
  toggleCrowdFlow: () => void;
  togglePatrol: () => void;
  toggleShuttleBus: () => void;
  updateAnimationStats: (stats: any) => void;
  cleanupAnimationSystems: () => void;
  
  // Scenario methods
  initializeScenarioSystems: () => void;
  activateDemoMode: () => Promise<void>;
  activateConcertMode: () => Promise<void>;
  activateTyphoonMode: () => Promise<void>;
  resetToNormalMode: () => Promise<void>;
  
  // Weather methods
  setWeatherSignal: (signal: WeatherSignal) => Promise<void>;
  updateWeatherStats: (stats: WeatherStats) => void;
  
  // UI methods
  setDrawerOpen: (open: boolean) => void;
  setDrawerActiveTab: (tab: string) => void;
  openDrawerWithTab: (tab: string) => void;
  
  // Cleanup
  cleanupAllSystems: () => void;
  destroy: () => void;
}

export const useMapStore = create<MapStore>((set, get) => ({
  mapState: {
    mapboxToken: 'pk.eyJ1IjoiY2hld2VpdGFvIiwiYSI6ImNsNDUzb3F4eDA3anozY3FsYzA1ZDh5eWQifQ.9Ti0_dLR6wN4WoUUvjwO_w',
    tilesUrl: 'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=',
  },
  
  animationState: {
    isAnimationEngineActive: false,
    isCrowdFlowActive: false,
    isPatrolActive: false,
    isShuttleBusActive: false,
    animationStats: {
      fps: 60,
      activeAnimations: 0,
      memoryUsage: 0
    }
  },
  
  scenarioState: {
    currentMode: ScenarioMode.NORMAL,
    isTransitioning: false,
    lastModeChange: null
  },
  
  weatherState: {
    currentSignal: WeatherSignal.NORMAL,
    weatherStats: null,
    isEmergencyActive: false
  },
  
  uiState: {
    drawerOpen: false,
    drawerActiveTab: 'overview'
  },
  
  layerManager: null,
  animationEngine: null,
  crowdFlowSimulator: null,
  patrolSystem: null,
  shuttleBusSystem: null,
  scenarioManager: null,
  weatherSignalSystem: null,
  dataSimulationService: null,
  
  // Map methods
  updateMapboxToken: (token) => set((state) => ({
    mapState: { ...state.mapState, mapboxToken: token }
  })),
  
  updateTilesUrl: (url) => set((state) => ({
    mapState: { ...state.mapState, tilesUrl: url }
  })),
  
  updateMapState: (newState) => set((state) => ({
    mapState: { ...state.mapState, ...newState }
  })),
  
  // Layer methods
  setLayerManager: (layerManager) => {
    set({ layerManager });
    
    // 如果场景管理器已经初始化，立即设置LayerManager依赖
    const { scenarioManager } = get();
    if (scenarioManager) {
      scenarioManager.setLayerManager(layerManager);
    }
  },
  
  // Animation methods
  initializeAnimationSystems: () => {
    const state = get();
    if (!state.animationEngine && state.layerManager) {
      try {
        const engine = new AnimationEngine(state.layerManager);
        const crowdFlow = new CrowdFlowSimulator(engine, state.layerManager);
        const patrol = new PatrolAnimationSystem(engine, state.layerManager);
        const shuttleBus = new ShuttleBusSystem(engine, state.layerManager);
        
        set({
          animationEngine: engine,
          crowdFlowSimulator: crowdFlow,
          patrolSystem: patrol,
          shuttleBusSystem: shuttleBus,
          animationState: {
            ...state.animationState,
            isAnimationEngineActive: true
          }
        });
        
        console.log('Animation systems initialized successfully');
      } catch (error) {
        console.error('Failed to initialize animation systems:', error);
      }
    } else if (!state.layerManager) {
      console.warn('Cannot initialize animation systems: LayerManager not available');
    }
  },
  
  setAnimationEngine: (engine) => set({ animationEngine: engine }),
  
  toggleCrowdFlow: () => {
    const { crowdFlowSimulator, animationState } = get();
    if (crowdFlowSimulator) {
      if (animationState.isCrowdFlowActive) {
        crowdFlowSimulator.stopSimulation();
      } else {
        crowdFlowSimulator.startSimulation();
      }
      set({
        animationState: {
          ...animationState,
          isCrowdFlowActive: !animationState.isCrowdFlowActive
        }
      });
    }
  },
  
  togglePatrol: () => {
    const { patrolSystem, animationState } = get();
    if (patrolSystem) {
      if (animationState.isPatrolActive) {
        patrolSystem.stopPatrolSystem();
      } else {
        patrolSystem.startPatrolSystem();
      }
      set({
        animationState: {
          ...animationState,
          isPatrolActive: !animationState.isPatrolActive
        }
      });
    }
  },
  
  toggleShuttleBus: () => {
    const { shuttleBusSystem, animationState } = get();
    if (shuttleBusSystem) {
      if (animationState.isShuttleBusActive) {
        shuttleBusSystem.stopBusSystem();
      } else {
        shuttleBusSystem.startBusSystem();
      }
      set({
        animationState: {
          ...animationState,
          isShuttleBusActive: !animationState.isShuttleBusActive
        }
      });
    }
  },
  
  updateAnimationStats: (stats) => {
    const { animationState } = get();
    set({
      animationState: {
        ...animationState,
        animationStats: { ...animationState.animationStats, ...stats }
      }
    });
  },
  
  cleanupAnimationSystems: () => {
    const { animationEngine, crowdFlowSimulator, patrolSystem, shuttleBusSystem } = get();
    
    if (crowdFlowSimulator) crowdFlowSimulator.stopSimulation();
    if (patrolSystem) patrolSystem.stopPatrolSystem();
    if (shuttleBusSystem) shuttleBusSystem.stopBusSystem();
    if (animationEngine) animationEngine.stop();
    
    set({
      animationEngine: null,
      crowdFlowSimulator: null,
      patrolSystem: null,
      shuttleBusSystem: null,
      animationState: {
        isAnimationEngineActive: false,
        isCrowdFlowActive: false,
        isPatrolActive: false,
        isShuttleBusActive: false,
        animationStats: {
          fps: 60,
          activeAnimations: 0,
          memoryUsage: 0
        }
      }
    });
  },
  
  // Scenario methods
  initializeScenarioSystems: () => {
    const state = get();
    if (!state.scenarioManager || !state.weatherSignalSystem) {// 初始化场景管理器
      const scenarioManager = new ScenarioManager();
      const weatherSignalSystem = new WeatherSignalSystem();
      const dataSimulationService = new DataSimulationService();
      
      // 设置回调
      scenarioManager.setOnModeChange((mode) => {
        set({
          scenarioState: {
            ...get().scenarioState,
            currentMode: mode,
            isTransitioning: false,
            lastModeChange: new Date()
          }
        });
        console.log(`Scenario mode changed to: ${mode}`);
      });
      
      weatherSignalSystem.setOnSignalChange((signal, config) => {
        set({
          weatherState: {
            ...get().weatherState,
            currentSignal: signal,
            isEmergencyActive: config.emergencyLevel >= 3
          }
        });
      });
      
      weatherSignalSystem.setOnStatsUpdate((stats) => {
        get().updateWeatherStats(stats);
      });
      
      set({
        scenarioManager,
        weatherSignalSystem,
        dataSimulationService
      });
      
      // 设置系统依赖
      if (state.layerManager) {
        scenarioManager.setLayerManager(state.layerManager);
      }
      if (state.animationEngine) {
        scenarioManager.setAnimationEngine(state.animationEngine);
      }
      if (state.crowdFlowSimulator) {
        scenarioManager.setCrowdFlowSimulator(state.crowdFlowSimulator);
      }
      if (state.patrolSystem) {
        scenarioManager.setPatrolSystem(state.patrolSystem);
      }
      if (state.shuttleBusSystem) {
        scenarioManager.setShuttleBusSystem(state.shuttleBusSystem);
      }
      
      scenarioManager.setWeatherSignalSystem(weatherSignalSystem);
      
      // 设置数据模拟服务
      scenarioManager.setDataSimulationService(dataSimulationService);
    }
  },
  
  activateDemoMode: async () => {
    const { scenarioManager, scenarioState } = get();
    console.log('mapStore: activateDemoMode 被调用', { scenarioManager: !!scenarioManager, isTransitioning: scenarioState.isTransitioning });
    
    if (scenarioManager && !scenarioState.isTransitioning) {
      console.log('mapStore: 开始激活演示模式');
      set({
        scenarioState: {
          ...scenarioState,
          isTransitioning: true
        }
      });
      try {
        console.log('mapStore: 调用 scenarioManager.activateDemoMode()');
        await scenarioManager.activateDemoMode();
        console.log('mapStore: 演示模式激活成功');
      } catch (error) {
        console.error('激活演示模式失败:', error);
        set({
          scenarioState: {
            ...scenarioState,
            isTransitioning: false
          }
        });
      }
    } else {
      console.warn('mapStore: 无法激活演示模式', { 
        hasScenarioManager: !!scenarioManager, 
        isTransitioning: scenarioState.isTransitioning 
      });
    }
  },
  
  activateConcertMode: async () => {
    const { scenarioManager, scenarioState } = get();
    if (scenarioManager && !scenarioState.isTransitioning) {
      set({
        scenarioState: {
          ...scenarioState,
          isTransitioning: true
        }
      });
      try {
        await scenarioManager.activateConcertMode();
      } catch (error) {
        console.error('激活演唱会模式失败:', error);
        set({
          scenarioState: {
            ...scenarioState,
            isTransitioning: false
          }
        });
      }
    }
  },
  
  activateTyphoonMode: async () => {
    const { scenarioManager, scenarioState } = get();
    if (scenarioManager && !scenarioState.isTransitioning) {
      set({
        scenarioState: {
          ...scenarioState,
          isTransitioning: true
        }
      });
      try {
        await scenarioManager.activateTyphoonMode();
      } catch (error) {
        console.error('激活T8台风模式失败:', error);
        set({
          scenarioState: {
            ...scenarioState,
            isTransitioning: false
          }
        });
      }
    }
  },
  
  resetToNormalMode: async () => {
    const { scenarioManager, scenarioState } = get();
    if (scenarioManager && !scenarioState.isTransitioning) {
      set({
        scenarioState: {
          ...scenarioState,
          isTransitioning: true
        }
      });
      try {
        await scenarioManager.resetToNormalMode();
      } catch (error) {
        console.error('重置为正常模式失败:', error);
        set({
          scenarioState: {
            ...scenarioState,
            isTransitioning: false
          }
        });
      }
    }
  },
  
  // Weather methods
  setWeatherSignal: async (signal: WeatherSignal) => {
    const { weatherSignalSystem } = get();
    if (weatherSignalSystem) {
      try {
        await weatherSignalSystem.setSignal(signal);
      } catch (error) {
        console.error('设置天气信号失败:', error);
      }
    }
  },
  
  updateWeatherStats: (stats: WeatherStats) => {
    const { weatherState } = get();
    set({
      weatherState: {
        ...weatherState,
        weatherStats: stats
      }
    });
  },
  
  // UI methods
  setDrawerOpen: (open: boolean) => {
    const { uiState } = get();
    set({
      uiState: {
        ...uiState,
        drawerOpen: open
      }
    });
  },
  
  setDrawerActiveTab: (tab: string) => {
    const { uiState } = get();
    set({
      uiState: {
        ...uiState,
        drawerActiveTab: tab
      }
    });
  },
  
  openDrawerWithTab: (tab: string) => {
    const { uiState } = get();
    set({
      uiState: {
        ...uiState,
        drawerOpen: true,
        drawerActiveTab: tab
      }
    });
  },
  
  // Cleanup all systems
  cleanupAllSystems: () => {
    const { scenarioManager, weatherSignalSystem, dataSimulationService } = get();
    
    // 清理动画系统
    get().cleanupAnimationSystems();
    
    // 清理场景和天气系统
    if (scenarioManager) {
      scenarioManager.cleanup();
    }
    if (weatherSignalSystem) {
      weatherSignalSystem.cleanup();
    }
    if (dataSimulationService) {
      dataSimulationService.cleanup();
    }
    
    set({
      layerManager: null,
      scenarioManager: null,
      weatherSignalSystem: null,
      dataSimulationService: null,
      scenarioState: {
        currentMode: ScenarioMode.NORMAL,
        isTransitioning: false,
        lastModeChange: null
      },
      weatherState: {
        currentSignal: WeatherSignal.NORMAL,
        weatherStats: null,
        isEmergencyActive: false
      }
    });
  },

  // 完整销毁Store
  destroy: () => {
    try {
      console.log('开始销毁MapStore...');
      
      const state = get();
      
      // 停止所有动画系统
      if (state.animationEngine) {
        state.animationEngine.destroy();
      }
      if (state.crowdFlowSimulator) {
        state.crowdFlowSimulator.destroy();
      }
      if (state.patrolSystem) {
        state.patrolSystem.destroy();
      }
      if (state.shuttleBusSystem) {
        state.shuttleBusSystem.destroy();
      }
      
      // 销毁LayerManager
      if (state.layerManager) {
        state.layerManager.destroy();
      }
      
      // 销毁场景管理器
      if (state.scenarioManager) {
        state.scenarioManager.cleanup();
      }
      
      // 销毁天气系统
      if (state.weatherSignalSystem) {
        state.weatherSignalSystem.cleanup();
      }
      
      // 销毁数据模拟服务
      if (state.dataSimulationService) {
        state.dataSimulationService.cleanup();
      }
      
      // 重置所有状态
      set({
        mapState: {
          mapboxToken: 'pk.eyJ1IjoiY2hld2VpdGFvIiwiYSI6ImNsNDUzb3F4eDA3anozY3FsYzA1ZDh5eWQifQ.9Ti0_dLR6wN4WoUUvjwO_w',
          tilesUrl: ''
        },
        layerManager: null,
        animationEngine: null,
        crowdFlowSimulator: null,
        patrolSystem: null,
        shuttleBusSystem: null,
        scenarioManager: null,
        weatherSignalSystem: null,
        dataSimulationService: null,
        animationState: {
          isAnimationEngineActive: false,
          isCrowdFlowActive: false,
          isPatrolActive: false,
          isShuttleBusActive: false,
          animationStats: {
            fps: 60,
            activeAnimations: 0,
            memoryUsage: 0
          }
        },
        scenarioState: {
          currentMode: ScenarioMode.NORMAL,
          isTransitioning: false,
          lastModeChange: null
        },
        weatherState: {
          currentSignal: WeatherSignal.NORMAL,
          weatherStats: null,
          isEmergencyActive: false
        },
        uiState: {
          drawerOpen: false,
          drawerActiveTab: 'overview'
        }
      });
      
      console.log('MapStore销毁完成');
    } catch (error) {
      console.error('MapStore销毁失败:', error);
    }
  }
}));