import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Trash2 } from 'lucide-react';
import { globalResourceManager } from '../utils/ResourceManager';
import { useAutoCleanupTimer } from '../hooks/useCleanup';
import { useAppStore } from '../store';

interface MemoryUsage {
  anprLogsCount: number;
  vehicleRecordsCount: number;
  elevatorStatusesCount: number;
  hasKpiData: boolean;
  lastUpdate: Date | null;
}

const MemoryMonitor: React.FC = () => {
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { getMemoryUsage, cleanupOldData, cleanupRealtimeData } = useAppStore();

  // 更新内存使用情况
  const updateMemoryUsage = () => {
    const usage = getMemoryUsage();
    setMemoryUsage(usage);
  };

  // 使用自动清理定时器
  useAutoCleanupTimer('MemoryMonitor', updateMemoryUsage, 5000, true);
  
  // 初始化时更新一次
  useEffect(() => {
    updateMemoryUsage();
  }, []);

  // 手动清理旧数据
  const handleCleanupOldData = () => {
    cleanupOldData();
    updateMemoryUsage();
  };

  // 完全清理实时数据
  const handleFullCleanup = () => {
    cleanupRealtimeData();
    updateMemoryUsage();
  };

  // 获取内存状态
  const getMemoryStatus = () => {
    if (!memoryUsage) return { status: 'unknown', color: 'gray' };
    
    const totalItems = memoryUsage.anprLogsCount + memoryUsage.vehicleRecordsCount;
    
    if (totalItems > 300) {
      return { status: 'high', color: 'red' };
    } else if (totalItems > 150) {
      return { status: 'medium', color: 'yellow' };
    } else {
      return { status: 'low', color: 'green' };
    }
  };

  const memoryStatus = getMemoryStatus();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 flex items-center space-x-2 text-sm transition-colors"
      >
        <Activity className="h-4 w-4" />
        <span>内存监控</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className="text-white font-medium">内存监控</span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {memoryUsage && (
          <>
            {/* 内存状态 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">内存状态:</span>
              <div className={`px-2 py-1 rounded text-xs flex items-center ${
                memoryStatus.color === 'red' ? 'bg-red-500/20 text-red-400' :
                memoryStatus.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {memoryStatus.status === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {memoryStatus.status === 'high' ? '高' : 
                 memoryStatus.status === 'medium' ? '中' : '低'}
              </div>
            </div>

            {/* 数据统计 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">ANPR日志:</span>
                <span className="text-white">{memoryUsage.anprLogsCount} 条</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">车辆记录:</span>
                <span className="text-white">{memoryUsage.vehicleRecordsCount} 条</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">电梯状态:</span>
                <span className="text-white">{memoryUsage.elevatorStatusesCount} 部</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">KPI数据:</span>
                <span className="text-white">{memoryUsage.hasKpiData ? '已加载' : '未加载'}</span>
              </div>
              {memoryUsage.lastUpdate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">最后更新:</span>
                  <span className="text-xs text-white">
                    {memoryUsage.lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* 清理操作 */}
            <div className="space-y-2 pt-2 border-t border-gray-600">
              <button
                onClick={handleCleanupOldData}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-xs flex items-center justify-center space-x-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>清理旧数据</span>
              </button>
              <button
                onClick={handleFullCleanup}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs flex items-center justify-center space-x-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>完全清理</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MemoryMonitor;