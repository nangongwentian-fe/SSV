import { create } from 'zustand';
import { SimulationState } from '../types';
import { useKPIStore } from './kpiStore';
import { useSystemStore } from './systemStore';
import { useAlertStore } from './alertStore';
import { useDeviceStore } from './deviceStore';
import { useParkingStore } from './parkingStore';
import { useWeatherStore } from './weatherStore';

interface SimulationStore {
  simulationState: SimulationState;
  startSimulation: () => void;
  stopSimulation: () => void;
  isSimulationRunning: () => boolean;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  simulationState: {
    isRunning: false,
    intervalId: null,
  },
  
  startSimulation: () => {
    const { simulationState } = get();
    
    // 如果已经在运行，先停止
    if (simulationState.isRunning && simulationState.intervalId) {
      clearInterval(simulationState.intervalId);
    }
    
    // 启动新的模拟定时器
    const intervalId = setInterval(() => {
      // 更新KPI数据
      useKPIStore.getState().generateRandomKPIData();
      
      // 更新系统状态
      useSystemStore.getState().generateRandomSystemStatus();
      
      // 更新设备状态
      useDeviceStore.getState().generateRandomDeviceData();
      
      // 更新停车场数据
      useParkingStore.getState().generateRandomParkingData();
      
      // 更新天气数据
      useWeatherStore.getState().generateRandomWeatherData();
      
      // 随机生成警报（概率较低）
      if (Math.random() < 0.1) { // 10%概率生成新警报
        useAlertStore.getState().generateRandomAlert();
      }
    }, 5000); // 每5秒更新一次
    
    set({
      simulationState: {
        isRunning: true,
        intervalId,
      }
    });
  },
  
  stopSimulation: () => {
    const { simulationState } = get();
    
    if (simulationState.intervalId) {
      clearInterval(simulationState.intervalId);
    }
    
    set({
      simulationState: {
        isRunning: false,
        intervalId: null,
      }
    });
  },
  
  isSimulationRunning: () => {
    return get().simulationState.isRunning;
  },
}));