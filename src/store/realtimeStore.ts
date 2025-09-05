import { create } from 'zustand';
import { KPIData, ElevatorStatus, ANPRLog } from '../services/DataSimulator';
import { ElevatorStatistics } from '../services/ElevatorController';
import { VehicleRecord } from '../services/ANPRLogger';
import { ANPRStatistics } from '../services/ANPRLogger';
import { dataSimulator } from '../services/DataSimulator';
import { elevatorController } from '../services/ElevatorController';
import { anprLogger } from '../services/ANPRLogger';
import { globalTimerManager } from '../utils/TimerManager';

interface RealtimeStore {
  // KPI实时数据
  kpiData: KPIData | null;
  
  // 电梯实时数据
  elevators: ElevatorStatus[];
  elevatorStatistics: ElevatorStatistics | null;
  
  // ANPR实时数据
  recentANPRLogs: ANPRLog[];
  anprStatistics: ANPRStatistics | null;
  currentVehicles: VehicleRecord[];
  
  // 系统状态
  isSimulationRunning: boolean;
  lastUpdate: Date | null;
  cleanupTimerId: string;
  
  // 操作方法
  updateKPIData: (data: KPIData) => void;
  updateElevatorData: (elevators: ElevatorStatus[]) => void;
  addANPRLog: (log: ANPRLog) => void;
  
  // 控制方法
  startRealtime: () => void;
  stopRealtime: () => void;
  
  // 获取方法
  getKPIData: () => KPIData | null;
  getElevatorData: () => ElevatorStatus[];
  getRecentANPRLogs: (limit?: number) => ANPRLog[];
  
  // 清理方法
  cleanup: () => void;
  cleanupOldData: () => void;
  getMemoryUsage: () => {
    anprLogsCount: number;
    vehicleRecordsCount: number;
    elevatorStatusesCount: number;
    hasKpiData: boolean;
    lastUpdate: Date | null;
  };
}

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  // 初始状态
  kpiData: null,
  elevators: [],
  elevatorStatistics: null,
  recentANPRLogs: [],
  anprStatistics: null,
  currentVehicles: [],
  isSimulationRunning: false,
  lastUpdate: null,
  cleanupTimerId: 'realtime-store-cleanup',
  
  // 更新KPI数据
  updateKPIData: (data: KPIData) => {
    set({
      kpiData: data,
      lastUpdate: new Date()
    });
  },
  
  // 更新电梯数据
  updateElevatorData: (elevators: ElevatorStatus[]) => {
    set({
      elevators,
      elevatorStatistics: elevatorController.getStatistics(),
      lastUpdate: new Date()
    });
  },
  
  // 添加ANPR日志
  addANPRLog: (log: ANPRLog) => {
    set((state) => {
      const newLogs = [log, ...state.recentANPRLogs].slice(0, 50); // 保留最近50条
      return {
        recentANPRLogs: newLogs,
        anprStatistics: anprLogger.getStatistics(),
        currentVehicles: anprLogger.getCurrentVehicles(),
        lastUpdate: new Date()
      };
    });
  },
  
  // 启动实时数据
  startRealtime: () => {
    const state = get();
    if (state.isSimulationRunning) {
      console.warn('Realtime simulation is already running');
      return;
    }
    
    try {
      // 订阅DataSimulator事件
      dataSimulator.subscribe('kpi-update', (data: KPIData) => {
        get().updateKPIData(data);
      });
      
      dataSimulator.subscribe('elevator-update', (elevators: ElevatorStatus[]) => {
        // 更新ElevatorController
        elevatorController.updateElevatorStatus(elevators);
        get().updateElevatorData(elevators);
      });
      
      dataSimulator.subscribe('anpr-log', (log: ANPRLog) => {
        // 添加到ANPRLogger
        anprLogger.addLog(log);
        get().addANPRLog(log);
      });
      
      // 启动所有模拟
      dataSimulator.startAll();
      
      // 启动定时清理机制（每10分钟清理一次）
      const { cleanupTimerId } = get();
      globalTimerManager.setInterval(cleanupTimerId, () => {
        get().cleanupOldData();
      }, 10 * 60 * 1000);
      
      set({
        isSimulationRunning: true,
        lastUpdate: new Date()
      });
      
      console.log('Realtime data simulation started with cleanup mechanism');
    } catch (error) {
      console.error('Failed to start realtime simulation:', error);
    }
  },
  
  // 停止实时数据
  stopRealtime: () => {
    try {
      const { cleanupTimerId } = get();
      
      // 停止DataSimulator
      dataSimulator.stopAll();
      
      // 停止清理定时器
      globalTimerManager.clearInterval(cleanupTimerId);
      
      set({
        isSimulationRunning: false,
        lastUpdate: new Date()
      });
      
      console.log('Realtime data simulation stopped');
    } catch (error) {
      console.error('Failed to stop realtime simulation:', error);
    }
  },
  
  // 获取KPI数据
  getKPIData: () => {
    return get().kpiData;
  },
  
  // 获取电梯数据
  getElevatorData: () => {
    return get().elevators;
  },
  
  // 获取最近ANPR日志
  getRecentANPRLogs: (limit = 20) => {
    const logs = get().recentANPRLogs;
    return logs.slice(0, limit);
  },
  
  // 清理资源
  cleanup: () => {
    const state = get();
    if (state.isSimulationRunning) {
      get().stopRealtime();
    }
    
    // 清理所有服务
    dataSimulator.destroy();
    elevatorController.destroy();
    anprLogger.destroy();
    
    set({
      kpiData: null,
      elevators: [],
      elevatorStatistics: null,
      recentANPRLogs: [],
      anprStatistics: null,
      currentVehicles: [],
      isSimulationRunning: false,
      lastUpdate: null
    });
    
    console.log('Realtime store cleaned up');
  },

  // 数据清理机制
  cleanupOldData: () => {
    // 清理ANPR旧数据（保留30天）
    anprLogger.cleanupOldData(30);
    
    // 限制ANPR日志数量
    const currentLogs = get().recentANPRLogs;
    if (currentLogs.length > 100) {
      set({ recentANPRLogs: currentLogs.slice(-50) });
    }
    
    // 限制车辆记录数量
    const currentRecords = get().currentVehicles;
    if (currentRecords.length > 200) {
      set({ currentVehicles: currentRecords.slice(-100) });
    }
    
    console.log('Old data cleaned up');
  },

  // 内存监控
  getMemoryUsage: () => {
    const state = get();
    return {
      anprLogsCount: state.recentANPRLogs.length,
      vehicleRecordsCount: state.currentVehicles.length,
      elevatorStatusesCount: state.elevators.length,
      hasKpiData: !!state.kpiData,
      lastUpdate: state.lastUpdate
    };
  }
}));

// 导出便捷hooks
export const useKPIRealtime = () => {
  const store = useRealtimeStore();
  return {
    kpiData: store.kpiData,
    updateKPIData: store.updateKPIData,
    lastUpdate: store.lastUpdate
  };
};

export const useElevatorRealtime = () => {
  const store = useRealtimeStore();
  return {
    elevators: store.elevators,
    statistics: store.elevatorStatistics,
    updateElevatorData: store.updateElevatorData,
    lastUpdate: store.lastUpdate
  };
};

export const useANPRRealtime = () => {
  const store = useRealtimeStore();
  return {
    recentLogs: store.recentANPRLogs,
    statistics: store.anprStatistics,
    currentVehicles: store.currentVehicles,
    addLog: store.addANPRLog,
    getRecentLogs: store.getRecentANPRLogs,
    lastUpdate: store.lastUpdate
  };
};