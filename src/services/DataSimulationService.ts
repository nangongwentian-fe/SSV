import { globalTimerManager } from '../utils/TimerManager';

/**
 * 数据模拟服务
 * 负责模拟各种系统数据，如KPI、电梯、ANPR等
 */

export interface KPIData {
  totalVisitors: number;
  peakHourTraffic: number;
  averageWaitTime: number;
  systemUptime: number;
  energyConsumption: number;
  wasteGeneration: number;
}

export interface ElevatorData {
  elevatorId: string;
  currentFloor: number;
  direction: 'up' | 'down' | 'idle';
  occupancy: number;
  status: 'normal' | 'maintenance' | 'emergency';
  waitingPassengers: number;
}

export interface ANPRData {
  vehicleId: string;
  plateNumber: string;
  timestamp: Date;
  location: string;
  vehicleType: 'car' | 'bus' | 'truck' | 'motorcycle';
  speed: number;
  authorized: boolean;
}

export class DataSimulationService {
  private kpiInterval: boolean = false;
  private elevatorInterval: boolean = false;
  private anprInterval: boolean = false;
  
  private kpiData: KPIData = {
    totalVisitors: 0,
    peakHourTraffic: 0,
    averageWaitTime: 0,
    systemUptime: 99.5,
    energyConsumption: 0,
    wasteGeneration: 0
  };
  
  private elevatorData: ElevatorData[] = [];
  private anprData: ANPRData[] = [];
  
  private onKPIUpdate?: (data: KPIData) => void;
  private onElevatorUpdate?: (data: ElevatorData[]) => void;
  private onANPRUpdate?: (data: ANPRData[]) => void;
  
  constructor() {
    this.initializeElevatorData();
  }
  
  // 设置回调函数
  setOnKPIUpdate(callback: (data: KPIData) => void) {
    this.onKPIUpdate = callback;
  }
  
  setOnElevatorUpdate(callback: (data: ElevatorData[]) => void) {
    this.onElevatorUpdate = callback;
  }
  
  setOnANPRUpdate(callback: (data: ANPRData[]) => void) {
    this.onANPRUpdate = callback;
  }
  
  // 初始化电梯数据
  private initializeElevatorData(): void {
    for (let i = 1; i <= 8; i++) {
      this.elevatorData.push({
        elevatorId: `ELV-${i.toString().padStart(2, '0')}`,
        currentFloor: Math.floor(Math.random() * 20) + 1,
        direction: ['up', 'down', 'idle'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'idle',
        occupancy: Math.floor(Math.random() * 15),
        status: Math.random() > 0.1 ? 'normal' : (Math.random() > 0.5 ? 'maintenance' : 'emergency'),
        waitingPassengers: Math.floor(Math.random() * 10)
      });
    }
  }
  
  // 启动KPI模拟
  startKPISimulation(): void {
    if (this.kpiInterval) return;
    
    console.log('启动KPI数据模拟');
    globalTimerManager.setInterval('kpi-simulation', () => {
      this.updateKPIData();
      if (this.onKPIUpdate) {
        this.onKPIUpdate(this.kpiData);
      }
    }, 2000);
    this.kpiInterval = true;
    
    // 立即触发一次更新
    this.updateKPIData();
    if (this.onKPIUpdate) {
      this.onKPIUpdate(this.kpiData);
    }
  }
  
  // 停止KPI模拟
  stopKPISimulation(): void {
    if (this.kpiInterval) {
      console.log('停止KPI数据模拟');
      globalTimerManager.clearInterval('kpi-simulation');
      this.kpiInterval = false;
    }
  }
  
  // 启动电梯模拟
  startElevatorSimulation(): void {
    if (this.elevatorInterval) return;
    
    console.log('启动电梯数据模拟');
    globalTimerManager.setInterval('elevator-simulation', () => {
      this.updateElevatorData();
      if (this.onElevatorUpdate) {
        this.onElevatorUpdate(this.elevatorData);
      }
    }, 3000);
    this.elevatorInterval = true;
    
    // 立即触发一次更新
    if (this.onElevatorUpdate) {
      this.onElevatorUpdate(this.elevatorData);
    }
  }
  
  // 停止电梯模拟
  stopElevatorSimulation(): void {
    if (this.elevatorInterval) {
      console.log('停止电梯数据模拟');
      globalTimerManager.clearInterval('elevator-simulation');
      this.elevatorInterval = false;
    }
  }
  
  // 启动ANPR模拟
  startANPRSimulation(): void {
    if (this.anprInterval) return;
    
    console.log('启动ANPR数据模拟');
    globalTimerManager.setInterval('anpr-simulation', () => {
      this.generateANPRData();
      if (this.onANPRUpdate) {
        this.onANPRUpdate(this.anprData);
      }
    }, 5000);
    this.anprInterval = true;
  }
  
  // 停止ANPR模拟
  stopANPRSimulation(): void {
    if (this.anprInterval) {
      console.log('停止ANPR数据模拟');
      globalTimerManager.clearInterval('anpr-simulation');
      this.anprInterval = false;
    }
  }
  
  // 更新KPI数据
  private updateKPIData(): void {
    const hour = new Date().getHours();
    const isBusinessHour = hour >= 8 && hour <= 22;
    const baseTraffic = isBusinessHour ? 1000 : 200;
    
    this.kpiData = {
      totalVisitors: this.kpiData.totalVisitors + Math.floor(Math.random() * 50) + 10,
      peakHourTraffic: baseTraffic + Math.floor(Math.random() * 500),
      averageWaitTime: Math.random() * 5 + 2,
      systemUptime: Math.max(95, this.kpiData.systemUptime + (Math.random() - 0.5) * 0.1),
      energyConsumption: this.kpiData.energyConsumption + Math.random() * 10 + 5,
      wasteGeneration: this.kpiData.wasteGeneration + Math.random() * 2 + 1
    };
  }
  
  // 更新电梯数据
  private updateElevatorData(): void {
    this.elevatorData.forEach(elevator => {
      // 随机更新电梯状态
      if (Math.random() > 0.7) {
        elevator.direction = ['up', 'down', 'idle'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'idle';
      }
      
      // 更新楼层
      if (elevator.direction === 'up' && elevator.currentFloor < 20) {
        elevator.currentFloor += Math.random() > 0.5 ? 1 : 0;
      } else if (elevator.direction === 'down' && elevator.currentFloor > 1) {
        elevator.currentFloor -= Math.random() > 0.5 ? 1 : 0;
      }
      
      // 更新乘客数量
      elevator.occupancy = Math.max(0, Math.min(15, elevator.occupancy + Math.floor((Math.random() - 0.5) * 4)));
      elevator.waitingPassengers = Math.max(0, Math.min(20, elevator.waitingPassengers + Math.floor((Math.random() - 0.5) * 3)));
      
      // 随机状态变化
      if (Math.random() > 0.95) {
        elevator.status = Math.random() > 0.8 ? 'maintenance' : 'normal';
      }
    });
  }
  
  // 生成ANPR数据
  private generateANPRData(): void {
    const locations = ['入口A', '入口B', '出口A', '出口B', '停车场1', '停车场2'];
    const vehicleTypes: ('car' | 'bus' | 'truck' | 'motorcycle')[] = ['car', 'bus', 'truck', 'motorcycle'];
    
    // 生成1-3个新的ANPR记录
    const newRecords = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < newRecords; i++) {
      const plateNumber = this.generatePlateNumber();
      const anprRecord: ANPRData = {
        vehicleId: `V${Date.now()}-${i}`,
        plateNumber,
        timestamp: new Date(),
        location: locations[Math.floor(Math.random() * locations.length)],
        vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
        speed: Math.floor(Math.random() * 30) + 10,
        authorized: Math.random() > 0.1
      };
      
      this.anprData.unshift(anprRecord);
    }
    
    // 保持最近100条记录
    if (this.anprData.length > 100) {
      this.anprData = this.anprData.slice(0, 100);
    }
  }
  
  // 生成车牌号
  private generatePlateNumber(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let plate = '';
    // 香港车牌格式：XX1234 或 XXX123
    if (Math.random() > 0.5) {
      plate += letters[Math.floor(Math.random() * letters.length)];
      plate += letters[Math.floor(Math.random() * letters.length)];
      for (let i = 0; i < 4; i++) {
        plate += numbers[Math.floor(Math.random() * numbers.length)];
      }
    } else {
      plate += letters[Math.floor(Math.random() * letters.length)];
      plate += letters[Math.floor(Math.random() * letters.length)];
      plate += letters[Math.floor(Math.random() * letters.length)];
      for (let i = 0; i < 3; i++) {
        plate += numbers[Math.floor(Math.random() * numbers.length)];
      }
    }
    
    return plate;
  }
  
  // 获取当前数据
  getCurrentKPIData(): KPIData {
    return { ...this.kpiData };
  }
  
  getCurrentElevatorData(): ElevatorData[] {
    return [...this.elevatorData];
  }
  
  getCurrentANPRData(): ANPRData[] {
    return [...this.anprData];
  }
  
  // 清理资源
  cleanup(): void {
    this.stopKPISimulation();
    this.stopElevatorSimulation();
    this.stopANPRSimulation();
    
    this.onKPIUpdate = undefined;
    this.onElevatorUpdate = undefined;
    this.onANPRUpdate = undefined;
  }
}