import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Shield, 
  AlertTriangle, 
  Car, 
  Lock, 
  Unlock, 
  Eye, 
  Settings,
  Play,
  Pause,
  Clock,
  Activity
} from 'lucide-react';
import { useParkingStore } from '../../store/parkingStore';
import { useANPRRealtime, useRealtimeStore, useDeviceStore, useAlertStore } from '../../store';

interface CCTVCamera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  recording: boolean;
  lastSnapshot: string;
}

interface VehicleRecord {
  id: string;
  plateNumber: string;
  type: 'entry' | 'exit';
  timestamp: string;
  location: string;
  confidence: number;
}

interface SecurityAlert {
  id: string;
  type: 'intrusion' | 'suspicious' | 'vehicle' | 'access';
  message: string;
  location: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ParkingStatus {
  total: number;
  occupied: number;
  available: number;
  reserved: number;
}

export function SecurityTab() {
  const { parkingStatus, updateParkingStatus } = useParkingStore();
  const { 
    recentLogs: anprLogs, 
    statistics: anprStats, 
    currentVehicles: vehicleRecords 
  } = useANPRRealtime();
  const { startRealtime: startRealtimeSimulation } = useRealtimeStore();
  const { devices } = useDeviceStore();
  const { alerts } = useAlertStore();
  
  // 过滤出安全设备（摄像头等）
  const cameras = devices.filter(device => device.type === 'security').map(device => ({
    id: device.id,
    name: device.name,
    location: device.location,
    status: device.status === 'online' ? 'online' as const : device.status === 'offline' ? 'offline' as const : 'maintenance' as const,
    recording: device.status === 'online',
    lastSnapshot: `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=security%20camera%20view%20${device.location}&image_size=landscape_4_3`
  }));
  
  // 使用alertStore中的警报数据
  const securityAlerts = alerts.map(alert => ({
    id: alert.id,
    type: alert.type as 'intrusion' | 'suspicious' | 'vehicle' | 'access',
    message: alert.message,
    location: alert.location || '未知位置',
    timestamp: alert.timestamp.toLocaleString('zh-TW'),
    status: alert.resolved ? 'resolved' as const : (alert.priority === 'critical' ? 'investigating' as const : 'active' as const),
    priority: alert.priority as 'low' | 'medium' | 'high' | 'critical'
  }));
  // 移除静态vehicleRecords，使用实时数据





  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [patrolActive, setPatrolActive] = useState(false);
  const [gateStatus, setGateStatus] = useState<{ [key: string]: boolean }>({
    'gate-a': false,
    'gate-b': false
  });

  useEffect(() => {
    // 启动实时数据模拟
    startRealtimeSimulation();
  }, [startRealtimeSimulation]);

  const getCameraStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-400/20';
      case 'offline': return 'text-red-400 bg-red-400/20';
      case 'maintenance': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getCameraStatusText = (status: string) => {
    switch (status) {
      case 'online': return '在線';
      case 'offline': return '離線';
      case 'maintenance': return '維護中';
      default: return '未知';
    }
  };

  const getAlertPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getAlertStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400';
      case 'investigating': return 'text-yellow-400';
      case 'resolved': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const toggleGate = (gateId: string) => {
    setGateStatus(prev => ({
      ...prev,
      [gateId]: !prev[gateId]
    }));
  };

  const togglePatrol = () => {
    setPatrolActive(!patrolActive);
  };

  const updateAlertStatus = (alertId: string, newStatus: SecurityAlert['status']) => {
    // 这里应该调用alertStore的更新方法
    // 暂时保留本地逻辑
  };

  return (
    <div className="space-y-6">
      {/* 安防概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <div className="text-2xl font-bold text-green-400">
            {cameras.filter(c => c.status === 'online').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">在線攝像頭</div>
        </div>
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <div className="text-2xl font-bold text-blue-400">{parkingStatus.availableSpaces}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">可用車位</div>
        </div>
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <div className="text-2xl font-bold text-yellow-400">
            {securityAlerts.filter(a => a.status === 'active').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">活躍警報</div>
        </div>
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{anprStats?.totalToday || vehicleRecords.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">今日車輛記錄</div>
        </div>
      </div>

      {/* CCTV监控 */}
      <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CCTV 監控</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {cameras.map(camera => (
            <div key={camera.id} className="bg-gray-200/50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-900 dark:text-white font-medium text-sm">{camera.name}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${getCameraStatusColor(camera.status)}`}>
                  {getCameraStatusText(camera.status)}
                </div>
              </div>
              <div className="aspect-video bg-gray-800 rounded mb-3 overflow-hidden">
                {camera.status === 'online' ? (
                  <img 
                    src={camera.lastSnapshot} 
                    alt={`${camera.name} 監控畫面`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <div className="text-xs">無信號</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{camera.location}</span>
                <div className="flex items-center space-x-2">
                  {camera.recording && (
                    <div className="flex items-center space-x-1 text-red-400">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      <span>錄影中</span>
                    </div>
                  )}
                  <button 
                    onClick={() => setSelectedCamera(camera.id)}
                    className="text-[#ff880a] hover:text-[#e6770a] transition-colors"
                  >
                    查看
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 车场管理 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 停车场状态 */}
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">停車場狀態</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">總車位</span>
              <span className="text-gray-900 dark:text-white font-semibold">{parkingStatus.totalSpaces}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">已佔用</span>
              <span className="text-red-400 font-semibold">{parkingStatus.occupiedSpaces}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">可用</span>
              <span className="text-green-400 font-semibold">{parkingStatus.availableSpaces}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">使用率</span>
              <span className="text-yellow-400 font-semibold">{Math.round(parkingStatus.occupancyRate * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mt-4">
              <div 
                className="bg-gradient-to-r from-green-400 to-red-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${parkingStatus.occupancyRate * 100}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              使用率: {Math.round(parkingStatus.occupancyRate * 100)}%
            </div>
          </div>
        </div>

        {/* 闸门控制 */}
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">閘門控制</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Car className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">入口閘門 A</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">停車場主入口</div>
                </div>
              </div>
              <button 
                onClick={() => toggleGate('gate-a')}
                className={`p-2 rounded transition-colors ${
                  gateStatus['gate-a'] 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title={gateStatus['gate-a'] ? '關閉閘門' : '開啟閘門'}
              >
                {gateStatus['gate-a'] ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Car className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">出口閘門 B</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">停車場主出口</div>
                </div>
              </div>
              <button 
                onClick={() => toggleGate('gate-b')}
                className={`p-2 rounded transition-colors ${
                  gateStatus['gate-b'] 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title={gateStatus['gate-b'] ? '關閉閘門' : '開啟閘門'}
              >
                {gateStatus['gate-b'] ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">安全巡邏</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">自動巡邏模式</div>
                </div>
              </div>
              <button 
                onClick={togglePatrol}
                className={`px-4 py-2 rounded transition-colors text-sm ${
                  patrolActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {patrolActive ? '停止巡邏' : '開始巡邏'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 车辆记录和安防警报 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 车辆记录 */}
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">車輛記錄 (ANPR)</h3>
            {anprLogs && anprLogs.length > 0 && (
              <div className="flex items-center space-x-2 text-green-400">
                <Activity className="w-4 h-4" />
                <span className="text-sm">實時更新</span>
              </div>
            )}
          </div>
          
          {/* ANPR统计信息 */}
          {anprStats && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-200/50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-400">{anprStats.entriesToday}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">今日進入</div>
              </div>
              <div className="bg-gray-200/50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-400">{anprStats.exitsToday}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">今日離開</div>
              </div>
              <div className="bg-gray-200/50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-yellow-400">{anprStats.blacklistedToday}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">黑名單命中</div>
              </div>
            </div>
          )}
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(anprLogs && anprLogs.length > 0 ? anprLogs : vehicleRecords).map(record => (
              <div key={record.id} className="bg-gray-200/50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900 dark:text-white font-medium">{record.plateNumber}</span>
                  <div className="flex items-center space-x-2">
                    {record.isBlacklisted && (
                      <span className="px-2 py-1 rounded-full text-xs text-red-400 bg-red-400/20">
                        黑名單
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      record.type === 'entry' ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20'
                    }`}>
                      {record.type === 'entry' ? '進入' : '離開'}
                    </span>
                  </div>
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  {record.location} · {new Date(record.timestamp).toLocaleTimeString('zh-TW')}
                </div>
                <div className="text-gray-400 text-xs">
                  識別信心度: {(record.confidence || 0).toFixed(1)}%
                </div>
                {record.vehicleType && (
                  <div className="text-gray-400 text-xs">
                    車輛類型: {record.vehicleType}
                  </div>
                )}
              </div>
            ))}
            {(!anprLogs || anprLogs.length === 0) && vehicleRecords.length === 0 && (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">暫無車輛記錄</div>
              </div>
            )}
          </div>
        </div>

        {/* 安防警报 */}
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">安防警報</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {securityAlerts.map(alert => (
              <div key={alert.id} className="bg-gray-200/50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${getAlertPriorityColor(alert.priority)}`}>
                    {alert.priority.toUpperCase()}
                  </span>
                  <span className={`text-sm ${getAlertStatusColor(alert.status)}`}>
                    {alert.status === 'active' ? '進行中' : 
                     alert.status === 'investigating' ? '調查中' : '已解決'}
                  </span>
                </div>
                <div className="text-gray-900 dark:text-white text-sm mb-1">{alert.message}</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                  {alert.location} · {alert.timestamp}
                </div>
                <div className="flex space-x-2">
                  {alert.status === 'active' && (
                    <button 
                      onClick={() => updateAlertStatus(alert.id, 'investigating')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs transition-colors"
                    >
                      開始調查
                    </button>
                  )}
                  {alert.status === 'investigating' && (
                    <button 
                      onClick={() => updateAlertStatus(alert.id, 'resolved')}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                    >
                      標記解決
                    </button>
                  )}
                  <button className="text-[#ff880a] hover:text-[#e6770a] text-xs transition-colors">
                    查看詳情
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}