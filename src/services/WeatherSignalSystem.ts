export enum WeatherSignal {
  NORMAL = 'normal',
  T1 = 'T1',
  T3 = 'T3',
  T8 = 'T8',
  T10 = 'T10',
  AMBER = 'amber',
  RED = 'red',
  BLACK = 'black'
}

export interface WeatherSignalConfig {
  signal: WeatherSignal;
  name: string;
  description: string;
  color: string;
  emergencyLevel: number; // 0-5, 0为正常，5为最高警戒
  autoActions: {
    disableEvents: boolean;
    enableFloodLayers: boolean;
    activateEmergencyMode: boolean;
    notifyAuthorities: boolean;
  };
}

export interface WeatherStats {
  currentSignal: WeatherSignal;
  signalDuration: number; // 持续时间（分钟）
  emergencyLevel: number;
  affectedAreas: string[];
  lastUpdated: Date;
}

import { globalTimerManager } from '../utils/TimerManager';

export class WeatherSignalSystem {
  private currentSignal: WeatherSignal = WeatherSignal.NORMAL;
  private signalStartTime: Date = new Date();
  private onSignalChange?: (signal: WeatherSignal, config: WeatherSignalConfig) => void;
  private onStatsUpdate?: (stats: WeatherStats) => void;
  private updateInterval: string | null = null;
  private affectedAreas: string[] = [];

  private signalConfigs: Record<WeatherSignal, WeatherSignalConfig> = {
    [WeatherSignal.NORMAL]: {
      signal: WeatherSignal.NORMAL,
      name: '正常天气',
      description: '天气状况良好，无特殊警戒',
      color: '#22c55e',
      emergencyLevel: 0,
      autoActions: {
        disableEvents: false,
        enableFloodLayers: false,
        activateEmergencyMode: false,
        notifyAuthorities: false
      }
    },
    [WeatherSignal.T1]: {
      signal: WeatherSignal.T1,
      name: '一号风球',
      description: '戒备信号，预料本港受热带气旋影响',
      color: '#fbbf24',
      emergencyLevel: 1,
      autoActions: {
        disableEvents: false,
        enableFloodLayers: false,
        activateEmergencyMode: false,
        notifyAuthorities: false
      }
    },
    [WeatherSignal.T3]: {
      signal: WeatherSignal.T3,
      name: '三号风球',
      description: '强风信号，预料本港受强风影响',
      color: '#f97316',
      emergencyLevel: 2,
      autoActions: {
        disableEvents: false,
        enableFloodLayers: true,
        activateEmergencyMode: false,
        notifyAuthorities: true
      }
    },
    [WeatherSignal.T8]: {
      signal: WeatherSignal.T8,
      name: '八号风球',
      description: '烈风或暴风信号，预料本港受烈风或暴风影响',
      color: '#dc2626',
      emergencyLevel: 4,
      autoActions: {
        disableEvents: true,
        enableFloodLayers: true,
        activateEmergencyMode: true,
        notifyAuthorities: true
      }
    },
    [WeatherSignal.T10]: {
      signal: WeatherSignal.T10,
      name: '十号风球',
      description: '飓风信号，预料本港受飓风影响',
      color: '#7c2d12',
      emergencyLevel: 5,
      autoActions: {
        disableEvents: true,
        enableFloodLayers: true,
        activateEmergencyMode: true,
        notifyAuthorities: true
      }
    },
    [WeatherSignal.AMBER]: {
      signal: WeatherSignal.AMBER,
      name: '黄色暴雨警告',
      description: '黄色暴雨警告信号，预料香港广泛地区已录得或将录得每小时雨量超过30毫米的大雨',
      color: '#eab308',
      emergencyLevel: 2,
      autoActions: {
        disableEvents: false,
        enableFloodLayers: true,
        activateEmergencyMode: false,
        notifyAuthorities: true
      }
    },
    [WeatherSignal.RED]: {
      signal: WeatherSignal.RED,
      name: '红色暴雨警告',
      description: '红色暴雨警告信号，预料香港广泛地区已录得或将录得每小时雨量超过50毫米的大雨',
      color: '#dc2626',
      emergencyLevel: 3,
      autoActions: {
        disableEvents: true,
        enableFloodLayers: true,
        activateEmergencyMode: false,
        notifyAuthorities: true
      }
    },
    [WeatherSignal.BLACK]: {
      signal: WeatherSignal.BLACK,
      name: '黑色暴雨警告',
      description: '黑色暴雨警告信号，预料香港广泛地区已录得或将录得每小时雨量超过70毫米的大雨',
      color: '#1f2937',
      emergencyLevel: 5,
      autoActions: {
        disableEvents: true,
        enableFloodLayers: true,
        activateEmergencyMode: true,
        notifyAuthorities: true
      }
    }
  };

  constructor() {
    this.startStatsUpdate();
  }

  // 设置天气信号
  async setSignal(signal: WeatherSignal): Promise<void> {
    if (this.currentSignal === signal) {
      console.log(`天气信号已经是${signal}`);
      return;
    }

    const config = this.signalConfigs[signal];
    const previousSignal = this.currentSignal;
    
    console.log(`天气信号从${previousSignal}变更为${signal}`);
    
    this.currentSignal = signal;
    this.signalStartTime = new Date();
    
    // 更新受影响区域
    this.updateAffectedAreas(signal);
    
    // 执行自动应急响应
    await this.executeAutoActions(config);
    
    // 触发信号变更回调
    if (this.onSignalChange) {
      this.onSignalChange(signal, config);
    }
    
    // 立即更新统计数据
    this.updateStats();
  }

  // 获取当前信号
  getCurrentSignal(): WeatherSignal {
    return this.currentSignal;
  }

  // 获取信号配置
  getSignalConfig(signal: WeatherSignal): WeatherSignalConfig {
    return this.signalConfigs[signal];
  }

  // 获取当前信号配置
  getCurrentSignalConfig(): WeatherSignalConfig {
    return this.signalConfigs[this.currentSignal];
  }

  // 获取所有信号配置
  getAllSignalConfigs(): Record<WeatherSignal, WeatherSignalConfig> {
    return { ...this.signalConfigs };
  }

  // 获取统计数据
  getStats(): WeatherStats {
    const duration = Math.floor((Date.now() - this.signalStartTime.getTime()) / (1000 * 60));
    const config = this.getCurrentSignalConfig();
    
    return {
      currentSignal: this.currentSignal,
      signalDuration: duration,
      emergencyLevel: config.emergencyLevel,
      affectedAreas: [...this.affectedAreas],
      lastUpdated: new Date()
    };
  }

  // 设置信号变更回调
  setOnSignalChange(callback: (signal: WeatherSignal, config: WeatherSignalConfig) => void) {
    this.onSignalChange = callback;
  }

  // 设置统计更新回调
  setOnStatsUpdate(callback: (stats: WeatherStats) => void) {
    this.onStatsUpdate = callback;
  }

  // 检查是否为紧急状态
  isEmergencyState(): boolean {
    const config = this.getCurrentSignalConfig();
    return config.emergencyLevel >= 3;
  }

  // 检查是否需要禁用活动
  shouldDisableEvents(): boolean {
    const config = this.getCurrentSignalConfig();
    return config.autoActions.disableEvents;
  }

  // 检查是否需要启用洪水图层
  shouldEnableFloodLayers(): boolean {
    const config = this.getCurrentSignalConfig();
    return config.autoActions.enableFloodLayers;
  }

  // 更新受影响区域
  private updateAffectedAreas(signal: WeatherSignal): void {
    const config = this.signalConfigs[signal];
    
    switch (config.emergencyLevel) {
      case 0:
        this.affectedAreas = [];
        break;
      case 1:
      case 2:
        this.affectedAreas = ['港岛区', '九龙区'];
        break;
      case 3:
      case 4:
        this.affectedAreas = ['港岛区', '九龙区', '新界区'];
        break;
      case 5:
        this.affectedAreas = ['港岛区', '九龙区', '新界区', '离岛区'];
        break;
      default:
        this.affectedAreas = [];
    }
  }

  // 执行自动应急响应
  private async executeAutoActions(config: WeatherSignalConfig): Promise<void> {
    console.log(`执行${config.signal}信号的自动应急响应:`, config.autoActions);
    
    // 这里可以集成其他系统的自动响应
    // 例如：通知物业管理系统、启动应急预案等
    
    if (config.autoActions.notifyAuthorities) {
      console.log('通知相关部门');
    }
    
    if (config.autoActions.activateEmergencyMode) {
      console.log('激活应急模式');
    }
  }

  // 开始统计数据更新
  private startStatsUpdate(): void {
    globalTimerManager.setInterval('weather-signal-stats', () => {
      this.updateStats();
    }, 60000); // 每分钟更新一次
    this.updateInterval = 'weather-signal-stats';
  }

  // 更新统计数据
  private updateStats(): void {
    if (this.onStatsUpdate) {
      const stats = this.getStats();
      this.onStatsUpdate(stats);
    }
  }

  // 清理资源
  cleanup(): void {
    if (this.updateInterval) {
      globalTimerManager.clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.onSignalChange = undefined;
    this.onStatsUpdate = undefined;
  }
}