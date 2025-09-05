// 主store文件 - 整合所有子store
import { useKPIStore } from './kpiStore';
import { useSystemStore } from './systemStore';
import { useAlertStore } from './alertStore';
import { useDeviceStore } from './deviceStore';
import { useParkingStore } from './parkingStore';
import { useWeatherStore } from './weatherStore';
import { useUIStore } from './uiStore';
import { useMapStore } from './mapStore';
import { useSimulationStore } from './simulationStore';
import { useRealtimeStore, useKPIRealtime, useElevatorRealtime, useANPRRealtime } from './realtimeStore';

// 重新导出所有store hooks
export { 
  useKPIStore, 
  useSystemStore, 
  useAlertStore, 
  useDeviceStore, 
  useParkingStore, 
  useWeatherStore, 
  useUIStore, 
  useMapStore, 
  useSimulationStore,
  useRealtimeStore,
  useKPIRealtime,
  useElevatorRealtime,
  useANPRRealtime
};

// 导出所有类型
export * from '../types';

// 提供一个组合hook来获取所有store的状态
export const useAppStore = () => {
  const kpiStore = useKPIStore();
  const systemStore = useSystemStore();
  const alertStore = useAlertStore();
  const deviceStore = useDeviceStore();
  const parkingStore = useParkingStore();
  const weatherStore = useWeatherStore();
  const uiStore = useUIStore();
  const mapStore = useMapStore();
  const simulationStore = useSimulationStore();
  const realtimeStore = useRealtimeStore();

  return {
    // KPI数据
    kpiData: kpiStore.kpiData,
    updateKPIData: kpiStore.updateKPIData,
    generateRandomKPIData: kpiStore.generateRandomKPIData,

    // 系统状态
    systemStatus: systemStore.systemStatus,
    updateSystemStatus: systemStore.updateSystemStatus,
    generateRandomSystemStatus: systemStore.generateRandomSystemStatus,

    // 警报管理
    alerts: alertStore.alerts,
    addAlert: alertStore.addAlert,
    removeAlert: alertStore.removeAlert,
    resolveAlert: alertStore.resolveAlert,
    clearAllAlerts: alertStore.clearAllAlerts,
    generateRandomAlert: alertStore.generateRandomAlert,

    // 设备状态
    devices: deviceStore.devices,
    addDevice: deviceStore.addDevice,
    updateDevice: deviceStore.updateDevice,
    removeDevice: deviceStore.removeDevice,
    updateDeviceStatus: deviceStore.updateDeviceStatus,
    generateRandomDeviceData: deviceStore.generateRandomDeviceData,

    // 停车场状态
    parkingStatus: parkingStore.parkingStatus,
    updateParkingStatus: parkingStore.updateParkingStatus,
    updateOccupancy: parkingStore.updateOccupancy,
    addRevenue: parkingStore.addRevenue,
    generateRandomParkingData: parkingStore.generateRandomParkingData,

    // 天气信号
    weatherSignal: weatherStore.weatherSignal,
    updateWeatherSignal: weatherStore.updateWeatherSignal,
    generateRandomWeatherData: weatherStore.generateRandomWeatherData,

    // UI状态
    uiState: uiStore.uiState,
    toggleSidebar: uiStore.toggleSidebar,
    setSidebarOpen: uiStore.setSidebarOpen,
    setActiveTab: uiStore.setActiveTab,
    toggleSettings: uiStore.toggleSettings,
    setSettingsOpen: uiStore.setSettingsOpen,
    updateUIState: uiStore.updateUIState,

    // 地图配置
    mapState: mapStore.mapState,
    updateMapboxToken: mapStore.updateMapboxToken,
    updateTilesUrl: mapStore.updateTilesUrl,
    updateMapState: mapStore.updateMapState,

    // 模拟控制
    simulationState: simulationStore.simulationState,
    startSimulation: simulationStore.startSimulation,
    stopSimulation: simulationStore.stopSimulation,
    isSimulationRunning: simulationStore.isSimulationRunning,

    // 实时数据
    realtimeKPIData: realtimeStore.kpiData,
    realtimeElevators: realtimeStore.elevators,
    realtimeANPRLogs: realtimeStore.recentANPRLogs,
    isRealtimeRunning: realtimeStore.isSimulationRunning,
    startRealtime: realtimeStore.startRealtime,
    stopRealtime: realtimeStore.stopRealtime,
    realtimeCleanup: realtimeStore.cleanup,

    // 实时数据清理
    cleanupRealtimeData: () => {
      useRealtimeStore.getState().cleanup();
    },

    // 清理旧数据
    cleanupOldData: () => {
      useRealtimeStore.getState().cleanupOldData();
    },

    // 获取内存使用情况
    getMemoryUsage: () => {
      return useRealtimeStore.getState().getMemoryUsage();
    },
  };
};

// 为了向后兼容，提供一个与原useStore相同接口的hook
export const useStore = useAppStore;