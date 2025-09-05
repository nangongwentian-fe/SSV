// 电梯群控系统
// 管理6部电梯的实时状态和控制

import { ElevatorStatus } from './DataSimulator';

export interface ElevatorControlCommand {
  elevatorId: string;
  action: 'call' | 'stop' | 'maintenance' | 'resume';
  targetFloor?: number;
  timestamp: Date;
}

export interface ElevatorStatistics {
  totalElevators: number;
  normalCount: number;
  maintenanceCount: number;
  peakModeCount: number;
  averageWaitTime: number;
  totalTrips: number;
}

/**
 * 电梯群控系统
 * 负责管理和控制所有电梯的状态
 */
export class ElevatorController {
  private elevators: Map<string, ElevatorStatus> = new Map();
  private commandHistory: ElevatorControlCommand[] = [];
  private statistics: ElevatorStatistics;
  private listeners: ((elevators: ElevatorStatus[]) => void)[] = [];

  constructor() {
    // 初始化6部电梯
    this.initializeElevators();
    
    // 初始化统计数据
    this.statistics = {
      totalElevators: 6,
      normalCount: 4,
      maintenanceCount: 1,
      peakModeCount: 1,
      averageWaitTime: 45,
      totalTrips: 1247
    };
  }

  /**
   * 初始化电梯状态
   */
  private initializeElevators(): void {
    const initialStates: ElevatorStatus[] = [
      { id: 'L1', floor: 0, currentFloor: 0, direction: '—', status: '正常', load: 0, targetFloor: 0, waitingCalls: [], lastUpdate: new Date(), lastMaintenance: new Date() },
      { id: 'L2', floor: 8, currentFloor: 8, direction: '↑', status: '正常', load: 45, targetFloor: 12, waitingCalls: [10, 15], lastUpdate: new Date(), lastMaintenance: new Date() },
      { id: 'L3', floor: 12, currentFloor: 12, direction: '↓', status: '高峰模式', load: 80, targetFloor: 1, waitingCalls: [8, 5, 1], lastUpdate: new Date(), lastMaintenance: new Date() },
      { id: 'L4', floor: 0, currentFloor: 0, direction: '—', status: '维保', load: 0, targetFloor: 0, waitingCalls: [], lastUpdate: new Date(), lastMaintenance: new Date() },
      { id: 'L5', floor: 5, currentFloor: 5, direction: '↑', status: '正常', load: 30, targetFloor: 8, waitingCalls: [7], lastUpdate: new Date(), lastMaintenance: new Date() },
      { id: 'L6', floor: 15, currentFloor: 15, direction: '↓', status: '正常', load: 60, targetFloor: 3, waitingCalls: [10, 6, 3], lastUpdate: new Date(), lastMaintenance: new Date() }
    ];

    initialStates.forEach(elevator => {
      this.elevators.set(elevator.id, elevator);
    });
  }

  /**
   * 订阅电梯状态更新
   */
  subscribe(callback: (elevators: ElevatorStatus[]) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 取消订阅
   */
  unsubscribe(callback: (elevators: ElevatorStatus[]) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const elevatorArray = Array.from(this.elevators.values());
    this.listeners.forEach(listener => {
      try {
        listener(elevatorArray);
      } catch (error) {
        console.error('Error in elevator status listener:', error);
      }
    });
  }

  /**
   * 更新电梯状态
   */
  updateElevatorStatus(elevators: ElevatorStatus[]): void {
    elevators.forEach(elevator => {
      this.elevators.set(elevator.id, {
        ...elevator,
        lastUpdate: new Date()
      });
    });

    // 更新统计数据
    this.updateStatistics();
    
    // 通知监听器
    this.notifyListeners();
  }

  /**
   * 获取所有电梯状态
   */
  getAllElevators(): ElevatorStatus[] {
    return Array.from(this.elevators.values());
  }

  /**
   * 获取特定电梯状态
   */
  getElevator(elevatorId: string): ElevatorStatus | undefined {
    return this.elevators.get(elevatorId);
  }

  /**
   * 执行电梯控制命令
   */
  executeCommand(command: ElevatorControlCommand): boolean {
    const elevator = this.elevators.get(command.elevatorId);
    if (!elevator) {
      console.error(`Elevator ${command.elevatorId} not found`);
      return false;
    }

    try {
      switch (command.action) {
        case 'call':
          this.callElevator(command.elevatorId, command.targetFloor || 0);
          break;
        case 'stop':
          this.stopElevator(command.elevatorId);
          break;
        case 'maintenance':
          this.setMaintenanceMode(command.elevatorId, true);
          break;
        case 'resume':
          this.setMaintenanceMode(command.elevatorId, false);
          break;
        default:
          console.error(`Unknown command action: ${command.action}`);
          return false;
      }

      // 记录命令历史
      this.commandHistory.push({
        ...command,
        timestamp: new Date()
      });

      // 限制历史记录数量
      if (this.commandHistory.length > 100) {
        this.commandHistory = this.commandHistory.slice(-50);
      }

      return true;
    } catch (error) {
      console.error(`Error executing command for ${command.elevatorId}:`, error);
      return false;
    }
  }

  /**
   * 呼叫电梯到指定楼层
   */
  private callElevator(elevatorId: string, targetFloor: number): void {
    const elevator = this.elevators.get(elevatorId);
    if (!elevator || elevator.status === '维保') {
      return;
    }

    const currentFloor = elevator.floor;
    let direction: '↑' | '↓' | '—' = '—';
    
    if (targetFloor > currentFloor) {
      direction = '↑';
    } else if (targetFloor < currentFloor) {
      direction = '↓';
    }

    this.elevators.set(elevatorId, {
      ...elevator,
      direction,
      lastUpdate: new Date()
    });

    console.log(`Elevator ${elevatorId} called to floor ${targetFloor}`);
    this.notifyListeners();
  }

  /**
   * 停止电梯
   */
  private stopElevator(elevatorId: string): void {
    const elevator = this.elevators.get(elevatorId);
    if (!elevator) {
      return;
    }

    this.elevators.set(elevatorId, {
      ...elevator,
      direction: '—',
      lastUpdate: new Date()
    });

    console.log(`Elevator ${elevatorId} stopped`);
    this.notifyListeners();
  }

  /**
   * 设置维保模式
   */
  private setMaintenanceMode(elevatorId: string, maintenance: boolean): void {
    const elevator = this.elevators.get(elevatorId);
    if (!elevator) {
      return;
    }

    this.elevators.set(elevatorId, {
      ...elevator,
      status: maintenance ? '维保' : '正常',
      direction: maintenance ? '—' : elevator.direction,
      floor: maintenance ? 0 : elevator.floor,
      lastUpdate: new Date()
    });

    console.log(`Elevator ${elevatorId} ${maintenance ? 'entered' : 'exited'} maintenance mode`);
    this.notifyListeners();
  }

  /**
   * 更新统计数据
   */
  private updateStatistics(): void {
    const elevators = Array.from(this.elevators.values());
    
    this.statistics = {
      totalElevators: elevators.length,
      normalCount: elevators.filter(e => e.status === '正常').length,
      maintenanceCount: elevators.filter(e => e.status === '维保').length,
      peakModeCount: elevators.filter(e => e.status === '高峰模式').length,
      averageWaitTime: this.calculateAverageWaitTime(),
      totalTrips: this.statistics.totalTrips + Math.floor(Math.random() * 3)
    };
  }

  /**
   * 计算平均等待时间
   */
  private calculateAverageWaitTime(): number {
    const activeElevators = Array.from(this.elevators.values())
      .filter(e => e.status !== '维保');
    
    if (activeElevators.length === 0) {
      return 0;
    }

    // 模拟计算平均等待时间
    const baseWaitTime = 30;
    const loadFactor = (6 - activeElevators.length) * 10;
    const randomVariation = Math.random() * 20 - 10;
    
    return Math.max(15, Math.round(baseWaitTime + loadFactor + randomVariation));
  }

  /**
   * 获取统计数据
   */
  getStatistics(): ElevatorStatistics {
    return { ...this.statistics };
  }

  /**
   * 获取命令历史
   */
  getCommandHistory(limit: number = 20): ElevatorControlCommand[] {
    return this.commandHistory.slice(-limit);
  }

  /**
   * 获取电梯运行状态摘要
   */
  getStatusSummary(): {
    operational: number;
    maintenance: number;
    peakMode: number;
    efficiency: number;
  } {
    const elevators = Array.from(this.elevators.values());
    const operational = elevators.filter(e => e.status === '正常').length;
    const maintenance = elevators.filter(e => e.status === '维保').length;
    const peakMode = elevators.filter(e => e.status === '高峰模式').length;
    const efficiency = Math.round((operational + peakMode) / elevators.length * 100);

    return {
      operational,
      maintenance,
      peakMode,
      efficiency
    };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.elevators.clear();
    this.commandHistory = [];
    this.listeners = [];
    console.log('ElevatorController destroyed');
  }
}

// 导出单例实例
export const elevatorController = new ElevatorController();