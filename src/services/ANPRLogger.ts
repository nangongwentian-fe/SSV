// ANPR车牌识别日志系统
// 负责记录和管理车牌识别数据

import { ANPRLog } from './DataSimulator';

export interface ANPRStatistics {
  totalToday: number;
  entriesToday: number;
  exitsToday: number;
  blacklistedToday: number;
  peakHourEntries: number;
  averageStayTime: number; // 分钟
}

export interface VehicleRecord {
  plateNumber: string;
  firstSeen: Date;
  lastSeen: Date;
  totalVisits: number;
  isBlacklisted: boolean;
  averageStayTime: number;
  status: '在场' | '离场';
}

/**
 * ANPR车牌识别日志系统
 * 负责管理车牌识别记录和统计
 */
export class ANPRLogger {
  private logs: ANPRLog[] = [];
  private vehicleRecords: Map<string, VehicleRecord> = new Map();
  private statistics: ANPRStatistics;
  private listeners: ((log: ANPRLog) => void)[] = [];
  private maxLogSize: number = 1000; // 最大日志数量

  constructor() {
    // 初始化统计数据
    this.statistics = {
      totalToday: 0,
      entriesToday: 0,
      exitsToday: 0,
      blacklistedToday: 0,
      peakHourEntries: 0,
      averageStayTime: 0
    };

    // 初始化一些历史数据
    this.initializeHistoricalData();
  }

  /**
   * 初始化历史数据
   */
  private initializeHistoricalData(): void {
    const historicalPlates = [
      'XX-1234', 'HK-5678', 'VR-9012', 'CN-3456', 'AM-7890',
      'ZZ-2468', 'XX-1357', 'HK-9753', 'VR-8642', 'CN-1928'
    ];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    historicalPlates.forEach((plate, index) => {
      const entryTime = new Date(today.getTime() + Math.random() * 8 * 60 * 60 * 1000); // 今天内随机时间
      const isBlacklisted = index === 7; // ZZ-2468 设为黑名单
      
      // 创建进场记录
      const entryLog: ANPRLog = {
        id: `anpr_${Date.now()}_${index}_entry`,
        timestamp: entryTime,
        plateNumber: plate,
        action: '进场',
        location: 'Main Gate',
        isBlacklisted
      };

      this.addLog(entryLog, false); // 不触发监听器

      // 70%概率已经离场
      if (Math.random() > 0.3) {
        const exitTime = new Date(entryTime.getTime() + (Math.random() * 4 + 1) * 60 * 60 * 1000); // 1-5小时后离场
        const exitLog: ANPRLog = {
          id: `anpr_${Date.now()}_${index}_exit`,
          timestamp: exitTime,
          plateNumber: plate,
          action: '出场',
          location: 'Main Gate',
          isBlacklisted
        };

        this.addLog(exitLog, false); // 不触发监听器
      }
    });

    // 更新统计数据
    this.updateStatistics();
  }

  /**
   * 订阅新日志事件
   */
  subscribe(callback: (log: ANPRLog) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 取消订阅
   */
  unsubscribe(callback: (log: ANPRLog) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(log: ANPRLog): void {
    this.listeners.forEach(listener => {
      try {
        listener(log);
      } catch (error) {
        console.error('Error in ANPR log listener:', error);
      }
    });
  }

  /**
   * 添加新的ANPR日志
   */
  addLog(log: ANPRLog, notify: boolean = true): void {
    // 添加到日志列表
    this.logs.push(log);

    // 限制日志数量
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize * 0.8); // 保留80%的日志
    }

    // 更新车辆记录
    this.updateVehicleRecord(log);

    // 更新统计数据
    this.updateStatistics();

    // 通知监听器
    if (notify) {
      this.notifyListeners(log);
    }

    console.log(`ANPR Log added: ${log.plateNumber} ${log.action} at ${log.timestamp.toLocaleTimeString()}`);
  }

  /**
   * 更新车辆记录
   */
  private updateVehicleRecord(log: ANPRLog): void {
    const existing = this.vehicleRecords.get(log.plateNumber);
    
    if (existing) {
      // 更新现有记录
      existing.lastSeen = log.timestamp;
      existing.totalVisits += log.action === '进场' ? 1 : 0;
      existing.status = log.action === '进场' ? '在场' : '离场';
      existing.isBlacklisted = log.isBlacklisted || existing.isBlacklisted;
      
      // 计算平均停留时间
      if (log.action === '出场') {
        const entryLogs = this.logs.filter(l => 
          l.plateNumber === log.plateNumber && 
          l.action === '进场' && 
          l.timestamp < log.timestamp
        );
        
        if (entryLogs.length > 0) {
          const lastEntry = entryLogs[entryLogs.length - 1];
          const stayTime = (log.timestamp.getTime() - lastEntry.timestamp.getTime()) / (1000 * 60); // 分钟
          existing.averageStayTime = (existing.averageStayTime + stayTime) / 2;
        }
      }
    } else {
      // 创建新记录
      const newRecord: VehicleRecord = {
        plateNumber: log.plateNumber,
        firstSeen: log.timestamp,
        lastSeen: log.timestamp,
        totalVisits: log.action === '进场' ? 1 : 0,
        isBlacklisted: log.isBlacklisted || false,
        averageStayTime: 0,
        status: log.action === '进场' ? '在场' : '离场'
      };
      
      this.vehicleRecords.set(log.plateNumber, newRecord);
    }
  }

  /**
   * 更新统计数据
   */
  private updateStatistics(): void {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayLogs = this.logs.filter(log => log.timestamp >= todayStart);
    
    this.statistics = {
      totalToday: todayLogs.length,
      entriesToday: todayLogs.filter(log => log.action === '进场').length,
      exitsToday: todayLogs.filter(log => log.action === '出场').length,
      blacklistedToday: todayLogs.filter(log => log.isBlacklisted).length,
      peakHourEntries: this.calculatePeakHourEntries(todayLogs),
      averageStayTime: this.calculateAverageStayTime()
    };
  }

  /**
   * 计算高峰时段进场数量
   */
  private calculatePeakHourEntries(todayLogs: ANPRLog[]): number {
    const peakHours = [8, 9, 17, 18]; // 上午8-9点，下午5-6点
    
    return todayLogs.filter(log => {
      const hour = log.timestamp.getHours();
      return log.action === '进场' && peakHours.includes(hour);
    }).length;
  }

  /**
   * 计算平均停留时间
   */
  private calculateAverageStayTime(): number {
    const records = Array.from(this.vehicleRecords.values());
    const validRecords = records.filter(r => r.averageStayTime > 0);
    
    if (validRecords.length === 0) {
      return 0;
    }
    
    const totalStayTime = validRecords.reduce((sum, record) => sum + record.averageStayTime, 0);
    return Math.round(totalStayTime / validRecords.length);
  }

  /**
   * 获取最近的日志记录
   */
  getRecentLogs(limit: number = 20): ANPRLog[] {
    return this.logs.slice(-limit).reverse(); // 最新的在前
  }

  /**
   * 获取今日日志记录
   */
  getTodayLogs(): ANPRLog[] {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return this.logs.filter(log => log.timestamp >= todayStart);
  }

  /**
   * 获取特定车牌的记录
   */
  getVehicleRecord(plateNumber: string): VehicleRecord | undefined {
    return this.vehicleRecords.get(plateNumber);
  }

  /**
   * 获取所有车辆记录
   */
  getAllVehicleRecords(): VehicleRecord[] {
    return Array.from(this.vehicleRecords.values());
  }

  /**
   * 获取在场车辆
   */
  getCurrentVehicles(): VehicleRecord[] {
    return Array.from(this.vehicleRecords.values())
      .filter(record => record.status === '在场');
  }

  /**
   * 获取黑名单车辆
   */
  getBlacklistedVehicles(): VehicleRecord[] {
    return Array.from(this.vehicleRecords.values())
      .filter(record => record.isBlacklisted);
  }

  /**
   * 获取统计数据
   */
  getStatistics(): ANPRStatistics {
    return { ...this.statistics };
  }

  /**
   * 搜索日志
   */
  searchLogs(query: {
    plateNumber?: string;
    action?: '进场' | '出场';
    startDate?: Date;
    endDate?: Date;
    isBlacklisted?: boolean;
  }): ANPRLog[] {
    return this.logs.filter(log => {
      if (query.plateNumber && !log.plateNumber.includes(query.plateNumber.toUpperCase())) {
        return false;
      }
      if (query.action && log.action !== query.action) {
        return false;
      }
      if (query.startDate && log.timestamp < query.startDate) {
        return false;
      }
      if (query.endDate && log.timestamp > query.endDate) {
        return false;
      }
      if (query.isBlacklisted !== undefined && log.isBlacklisted !== query.isBlacklisted) {
        return false;
      }
      return true;
    });
  }

  /**
   * 添加/移除黑名单
   */
  updateBlacklist(plateNumber: string, isBlacklisted: boolean): void {
    const record = this.vehicleRecords.get(plateNumber);
    if (record) {
      record.isBlacklisted = isBlacklisted;
      console.log(`Vehicle ${plateNumber} ${isBlacklisted ? 'added to' : 'removed from'} blacklist`);
    }
  }

  /**
   * 清理旧数据
   */
  cleanupOldData(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialLogCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    
    const removedCount = initialLogCount - this.logs.length;
    console.log(`Cleaned up ${removedCount} old ANPR logs`);
    
    // 更新统计数据
    this.updateStatistics();
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.logs = [];
    this.vehicleRecords.clear();
    this.listeners = [];
    console.log('ANPRLogger destroyed');
  }
}

// 导出单例实例
export const anprLogger = new ANPRLogger();