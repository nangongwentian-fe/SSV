// KPI数据接口
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
}

// 系统状态接口
export interface SystemStatus {
  hvac: 'normal' | 'warning' | 'error';
  lighting: 'normal' | 'warning' | 'error';
  security: 'normal' | 'warning' | 'error';
  elevator: 'normal' | 'warning' | 'error';
  fireSystem: 'normal' | 'warning' | 'error';
  waterSystem: 'normal' | 'warning' | 'error';
}

// 警报接口
export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  location?: string;
  resolved: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// 设备状态接口
export interface DeviceStatus {
  id: string;
  name: string;
  type: 'hvac' | 'lighting' | 'security' | 'elevator' | 'fire' | 'water';
  status: 'online' | 'offline' | 'maintenance';
  location: string;
  lastUpdate: Date;
  value?: number;
  unit?: string;
  uptime?: string;
  nextMaintenance?: string;
}

// 停车场状态接口
export interface ParkingStatus {
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  revenueToday: number;
  averageStayTime: number;
}

// 天气信号接口
export interface WeatherSignal {
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  timestamp: Date;
}

// UI状态接口
export interface UIState {
  sidebarOpen: boolean;
  activeTab: string;
  settingsOpen: boolean;
}

// 地图状态接口
export interface MapState {
  mapboxToken: string;
  tilesUrl: string;
}

// 模拟控制接口
export interface SimulationState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
}

// 地图图层相关接口
export interface MapLayer {
  id: string;
  name: string;
  type: 'circle' | 'symbol' | 'heatmap' | 'fill' | 'line';
  source: string;
  visible: boolean;
  data: GeoJSON.FeatureCollection;
  style: any;
}

// 传感器数据模型
export interface SensorData {
  id: string;
  type: '电表' | '水表' | '烟感' | '门禁';
  location: [number, number]; // [lng, lat]
  status: '红' | '橙' | '绿';
  value: number;
  lastUpdate: Date;
}

// CCTV摄像头模型
export interface CCTVCamera {
  id: string;
  name: string;
  location: [number, number];
  status: '红' | '橙' | '绿';
  snapshotUrl: string;
  isRecording: boolean;
}

// 人流数据模型
export interface FlowData {
  id: string;
  path: [number, number][];
  currentPosition: [number, number];
  progress: number; // 0-1
  speed: number;
  destination: 'MTR' | 'Taxi' | 'Runway';
}

// IAQ空气质量数据
export interface IAQData {
  id: string;
  location: [number, number];
  pm25: number;
  pm10: number;
  co2: number;
  temperature: number;
  humidity: number;
  status: '红' | '橙' | '绿';
}

// 垃圾桶数据
export interface BinData {
  id: string;
  location: [number, number];
  type: '一般垃圾' | '回收' | '厨余';
  fillLevel: number; // 0-100
  status: '红' | '橙' | '绿';
  lastCollection: Date;
}

// 内涝风险数据
export interface FloodRiskData {
  id: string;
  area: [number, number][];
  riskLevel: '低' | '中' | '高';
  waterLevel: number;
  status: '红' | '橙' | '绿';
}

// 安保巡更数据
export interface PatrolData {
  id: string;
  guardName: string;
  route: [number, number][];
  currentPosition: [number, number];
  progress: number;
  status: '巡逻中' | '休息' | '异常';
}

// 状态更新方法类型
export type StateUpdater<T> = (updater: (state: T) => T) => void;
export type StateSetter<T> = (value: T) => void;