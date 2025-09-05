import { useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Zap, Thermometer, Droplets, Wind, AlertTriangle } from 'lucide-react';
import { useKPIStore, useSystemStore, useAlertStore, useSimulationStore, useKPIRealtime, useRealtimeStore } from '../../store';

export default function OverviewTab() {
  const { kpiData } = useKPIStore();
  const { systemStatus } = useSystemStore();
  const { alerts } = useAlertStore();
  const { startSimulation, stopSimulation, isSimulationRunning } = useSimulationStore();
  const { kpiData: realtimeKPIData, lastUpdate } = useKPIRealtime();
  const { startRealtime, stopRealtime, isSimulationRunning: isRealtimeRunning } = useRealtimeStore();

  // 使用实时KPI数据，如果没有则回退到静态数据
  const currentKPIData = realtimeKPIData || kpiData;
  
  // 转换KPI数据格式以适配现有UI
  const formattedKpiData = [
    { 
      label: '用電量', 
      value: currentKPIData.energyConsumption ? currentKPIData.energyConsumption.toLocaleString() : kpiData.onlineUsers.toLocaleString(), 
      unit: currentKPIData.energyConsumption ? 'kWh' : '人', 
      trend: 'up', 
      change: '+2.3%', 
      status: 'normal',
      isRealtime: !!realtimeKPIData
    },
    { 
      label: '用水量', 
      value: currentKPIData.waterUsage ? currentKPIData.waterUsage.toFixed(1) : kpiData.waterUsage.toFixed(1), 
      unit: currentKPIData.waterUsage ? 'm³' : 'm³', 
      trend: 'down', 
      change: '-1.2%', 
      status: 'normal',
      isRealtime: !!realtimeKPIData
    },
    { 
      label: '車場空置率', 
      value: currentKPIData.occupancyRate ? currentKPIData.occupancyRate.toFixed(1) : kpiData.occupancyRate.toFixed(1), 
      unit: '%', 
      trend: 'stable', 
      change: '+0.8%', 
      status: currentKPIData.occupancyRate && currentKPIData.occupancyRate < 20 ? 'warning' : 'normal',
      isRealtime: !!realtimeKPIData
    },
    { 
      label: '舒適度指數', 
      value: currentKPIData.environmentalScore ? currentKPIData.environmentalScore.toString() : kpiData.environmentalScore.toString(), 
      unit: currentKPIData.environmentalScore ? '分' : '分', 
      trend: 'up', 
      change: '+1.5%', 
      status: currentKPIData.environmentalScore && currentKPIData.environmentalScore > 90 ? 'normal' : 'warning',
      isRealtime: !!realtimeKPIData
    },
    { 
      label: '溫度', 
      value: kpiData.temperature.toFixed(1), 
      unit: '°C', 
      trend: 'stable', 
      change: '0%', 
      status: 'normal',
      isRealtime: false
    },
    { 
      label: '濕度', 
      value: kpiData.humidity.toString(), 
      unit: '%', 
      trend: 'up', 
      change: '+1.8%', 
      status: kpiData.humidity > 70 ? 'warning' : 'normal',
      isRealtime: false
    }
  ];

  // 启动数据模拟
  useEffect(() => {
    if (!isSimulationRunning()) {
      startSimulation();
    }
    
    // 启动实时数据模拟
    if (!isRealtimeRunning) {
      startRealtime();
    }
    
    return () => {
      // 组件卸载时不停止模拟，让其他组件也能使用
    };
  }, [startSimulation, isSimulationRunning, startRealtime, isRealtimeRunning]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'critical': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-300 dark:border-gray-600 bg-gray-100/50 dark:bg-gray-800/50';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI 指标网格 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {formattedKpiData.map((kpi, index) => (
          <div key={index} className={`p-4 rounded-lg border ${getStatusColor(kpi.status)} transition-all duration-300 relative`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{kpi.label}</span>
              <div className="flex items-center space-x-1">
                {kpi.isRealtime && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="實時數據" />
                )}
                {getTrendIcon(kpi.trend)}
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white">{kpi.value}</span>
              <span className="text-sm text-gray-400">{kpi.unit}</span>
            </div>
            {kpi.change !== '0%' && (
              <div className={`text-xs mt-1 ${
                kpi.trend === 'up' ? 'text-green-400' : 
                kpi.trend === 'down' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {kpi.change} 較上期
              </div>
            )}
            {kpi.isRealtime && lastUpdate && (
              <div className="text-xs text-gray-500 mt-1">
                更新: {lastUpdate.toLocaleTimeString('zh-TW')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 系统状态概览 */}
      <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">系統狀態</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">電力系統</div>
            <div className="text-green-400 font-semibold">正常</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Droplets className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">供水系統</div>
            <div className="text-blue-400 font-semibold">正常</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Wind className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">通風系統</div>
            <div className="text-yellow-400 font-semibold">檢修中</div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">安防系統</div>
            <div className="text-green-400 font-semibold">正常</div>
          </div>
        </div>
      </div>

      {/* 实时警报 */}
      <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">實時警報</h3>
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-center space-x-3 p-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <div className="text-gray-900 dark:text-white text-sm">{alert.message}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">{alert.timestamp.toLocaleString('zh-TW')}</div>
              </div>
              <button className="text-[#ff880a] hover:text-[#e6770a] text-sm transition-colors">
                處理
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">快速操作</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="bg-[#ff880a] hover:bg-[#e6770a] text-white px-4 py-2 rounded-lg transition-colors text-sm">
            緊急廣播
          </button>
          <button className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors text-sm">
            系統重啟
          </button>
          <button className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors text-sm">
            備份數據
          </button>
          <button className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors text-sm">
            生成報告
          </button>
        </div>
      </div>
    </div>
  );
}