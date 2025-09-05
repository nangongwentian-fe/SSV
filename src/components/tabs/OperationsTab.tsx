import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, AlertCircle, CheckCircle, Clock, Wrench, Eye, EyeOff, Map, ArrowUp, ArrowDown, Minus, Users } from 'lucide-react';
import { useDeviceStore, useElevatorRealtime, useRealtimeStore } from '../../store';

interface MaintenanceLog {
  id: string;
  equipment: string;
  type: string;
  description: string;
  technician: string;
  date: string;
  status: 'completed' | 'pending' | 'in_progress';
}

interface LayerControlProps {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  onToggle: (id: string) => void;
}

function LayerControl({ id, name, description, visible, onToggle }: LayerControlProps) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-white font-medium text-sm">{name}</div>
          <div className="text-gray-400 text-xs">{description}</div>
        </div>
        <button
          onClick={() => onToggle(id)}
          className={`p-2 rounded transition-colors ${
            visible 
              ? 'bg-[#ff880a] hover:bg-[#e6770a] text-white' 
              : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
          }`}
          title={visible ? '隱藏圖層' : '顯示圖層'}
        >
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function OperationsTab() {
  const { devices, updateDeviceStatus } = useDeviceStore();
  const { elevators, statistics, lastUpdate } = useElevatorRealtime();
  const { startRealtime, isSimulationRunning } = useRealtimeStore();
  const mapRef = useRef<any>(null);

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([
    {
      id: '1',
      equipment: '電梯 B',
      type: '定期保養',
      description: '更換鋼纜，檢查制動系統',
      technician: '張師傅',
      date: '2024-01-28',
      status: 'in_progress'
    },
    {
      id: '2',
      equipment: '空調系統 B',
      type: '故障維修',
      description: '壓縮機異常，需要更換零件',
      technician: '李工程師',
      date: '2024-01-27',
      status: 'pending'
    },
    {
      id: '3',
      equipment: '供水泵 A',
      type: '定期檢查',
      description: '檢查水泵運行狀態，清潔過濾器',
      technician: '王師傅',
      date: '2024-01-25',
      status: 'completed'
    }
  ]);

  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  
  // 地图图层控制状态
  const [layerVisibility, setLayerVisibility] = useState({
    sensors: true,
    cctv: true,
    heatmap: false,
    shuttle: false,
    concert: false,
    runway: false,
    iaq: false,
    bins: false,
    flood: false,
    patrol: false
  });

  // 图层配置
  const layerConfigs = [
    { id: 'sensors', name: '設備點位', description: '傳感器和設備位置' },
    { id: 'cctv', name: 'CCTV攝像頭', description: '監控攝像頭位置' },
    { id: 'heatmap', name: '人流熱力圖', description: '實時人流密度分佈' },
    { id: 'shuttle', name: '穿梭巴士', description: '巴士路線和位置' },
    { id: 'concert', name: '演唱會散場', description: '演唱會散場人流' },
    { id: 'runway', name: 'Runway 1331', description: 'Runway 1331區域' },
    { id: 'iaq', name: 'IAQ空氣質量', description: '空氣質量監測點' },
    { id: 'bins', name: '垃圾桶/清運', description: '垃圾桶位置和清運狀態' },
    { id: 'flood', name: '內澇/暴雨風險', description: '內澇風險區域' },
    { id: 'patrol', name: '安保巡更', description: '安保巡更路線和位置' }
  ];

  // 获取地图实例的引用
  useEffect(() => {
    // 尝试从全局获取地图实例
    const mapInstance = (window as any).mapboxMapRef;
    if (mapInstance) {
      mapRef.current = mapInstance;
    }
    
    // 启动实时数据模拟
    if (!isSimulationRunning) {
      startRealtime();
    }
  }, [startRealtime, isSimulationRunning]);

  // 图层ID映射：OperationsTab中的简化ID -> LayerManager中的实际图层ID
  const layerIdMapping: { [key: string]: string } = {
    'sensors': 'sensors-layer',
    'cctv': 'cctv-layer', 
    'heatmap': 'heat-layer',
    'shuttle': 'bus-layer',
    'concert': 'flow-layer',
    'runway': 'fence-layer',
    'iaq': 'iaq-layer',
    'bins': 'bins-layer',
    'flood': 'flood-layer',
    'patrol': 'patrol-layer'
  };

  // 切换图层可见性
  const toggleLayerVisibility = (layerId: string) => {
    setLayerVisibility(prev => {
      const newVisibility = {
        ...prev,
        [layerId]: !prev[layerId as keyof typeof prev]
      };
      
      // 获取实际的图层ID
      const actualLayerId = layerIdMapping[layerId] || layerId;
      
      // 调用地图的图层切换方法
      if (mapRef.current && typeof mapRef.current.toggleLayer === 'function') {
        try {
          mapRef.current.toggleLayer(actualLayerId, newVisibility[layerId as keyof typeof newVisibility]);
        } catch (error) {
          console.warn(`Failed to toggle layer visibility for ${layerId} (${actualLayerId}):`, error);
        }
      }
      
      return newVisibility;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-400/20';
      case 'offline': return 'text-gray-400 bg-gray-400/20';
      case 'maintenance': return 'text-yellow-400 bg-yellow-400/20';
      case 'error': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'offline': return <Pause className="w-4 h-4" />;
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '運行中';
      case 'offline': return '已停止';
      case 'maintenance': return '維護中';
      case 'error': return '故障';
      default: return '未知';
    }
  };

  const getElevatorStatusIcon = (status: string) => {
    switch (status) {
      case 'moving_up': return <ArrowUp className="w-4 h-4 text-green-400" />;
      case 'moving_down': return <ArrowDown className="w-4 h-4 text-blue-400" />;
      case 'idle': return <Minus className="w-4 h-4 text-gray-400" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-yellow-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getElevatorStatusText = (status: string) => {
    switch (status) {
      case 'moving_up': return '上行中';
      case 'moving_down': return '下行中';
      case 'idle': return '待機中';
      case 'maintenance': return '維護中';
      case 'error': return '故障';
      default: return '未知';
    }
  };

  const getElevatorStatusColor = (status: string) => {
    switch (status) {
      case 'moving_up': return 'bg-green-400/20 border-green-400/30';
      case 'moving_down': return 'bg-blue-400/20 border-blue-400/30';
      case 'idle': return 'bg-gray-400/20 border-gray-400/30';
      case 'maintenance': return 'bg-yellow-400/20 border-yellow-400/30';
      case 'error': return 'bg-red-400/20 border-red-400/30';
      default: return 'bg-gray-400/20 border-gray-400/30';
    }
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'in_progress': return 'text-yellow-400';
      case 'pending': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getMaintenanceStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '進行中';
      case 'pending': return '待處理';
      default: return '未知';
    }
  };

  const handleEquipmentAction = (equipmentId: string, action: string) => {
    let newStatus: 'online' | 'offline' | 'maintenance' | 'error';
    switch (action) {
      case 'start':
      case 'restart':
        newStatus = 'online';
        break;
      case 'stop':
        newStatus = 'offline';
        break;
      case 'maintenance':
        newStatus = 'maintenance';
        break;
      default:
        return;
    }
    updateDeviceStatus(equipmentId, newStatus);
  };

  return (
    <div className="space-y-6">
      {/* 电梯群控状态概览 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">電梯群控系統</h3>
          {lastUpdate && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">
                更新: {lastUpdate.toLocaleTimeString('zh-TW')}
              </span>
            </div>
          )}
        </div>
        
        {/* 电梯统计 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
            <div className="text-xl font-bold text-green-400">{statistics?.normalCount || 0}</div>
            <div className="text-sm text-gray-400">運行中</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
            <div className="text-xl font-bold text-yellow-400">{statistics?.maintenanceCount || 0}</div>
            <div className="text-sm text-gray-400">維護中</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
            <div className="text-xl font-bold text-blue-400">{statistics?.totalTrips || 0}</div>
            <div className="text-sm text-gray-400">今日行程</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
            <div className="text-xl font-bold text-white">{statistics?.averageWaitTime || 0}s</div>
            <div className="text-sm text-gray-400">平均等待</div>
          </div>
        </div>
        
        {/* 电梯状态列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {elevators.map(elevator => (
            <div key={elevator.id} className={`rounded-lg p-4 border transition-all duration-300 ${getElevatorStatusColor(elevator.status)}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-white font-semibold">{elevator.id}</div>
                  <div className="flex items-center space-x-1">
                    {getElevatorStatusIcon(elevator.status)}
                    <span className="text-sm text-gray-300">{getElevatorStatusText(elevator.status)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono text-lg">{elevator.currentFloor}F</div>
                  <div className="text-xs text-gray-400">當前樓層</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-white font-medium">{elevator.load}</div>
                  <div className="text-gray-400">載重</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">{elevator.targetFloor || '-'}F</div>
                  <div className="text-gray-400">目標樓層</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">{elevator.waitingCalls?.length || 0}</div>
                  <div className="text-gray-400">等待呼叫</div>
                </div>
              </div>
              
              {elevator.lastMaintenance && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400">
                    上次維護: {new Date(elevator.lastMaintenance).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 设备状态概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-green-400">4</div>
          <div className="text-sm text-gray-400">運行中</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-yellow-400">1</div>
          <div className="text-sm text-gray-400">維護中</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-red-400">1</div>
          <div className="text-sm text-gray-400">故障</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-white">6</div>
          <div className="text-sm text-gray-400">總設備</div>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">設備狀態</h3>
        <div className="space-y-3">
          {devices.map(eq => (
            <div key={eq.id} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${getStatusColor(eq.status)}`}>
                    {getStatusIcon(eq.status)}
                    <span>{getStatusText(eq.status)}</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">{eq.name}</div>
                    <div className="text-gray-400 text-sm">{eq.type} · {eq.location}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right text-sm">
                    <div className="text-white">運行時間: {eq.uptime}</div>
                    <div className="text-gray-400">下次保養: {eq.nextMaintenance}</div>
                  </div>
                  <div className="flex space-x-1">
                    {eq.status === 'offline' && (
                      <button 
                        onClick={() => handleEquipmentAction(eq.id, 'start')}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        title="啟動"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {eq.status === 'online' && (
                      <button 
                        onClick={() => handleEquipmentAction(eq.id, 'stop')}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        title="停止"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleEquipmentAction(eq.id, 'restart')}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      title="重啟"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEquipmentAction(eq.id, 'maintenance')}
                      className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                      title="維護模式"
                    >
                      <Wrench className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setSelectedEquipment(eq.id)}
                      className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                      title="設置"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 维护记录 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">維護記錄</h3>
        <div className="space-y-3">
          {maintenanceLogs.map(log => (
            <div key={log.id} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-white font-medium">{log.equipment}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-400">{log.type}</span>
                    <span className={`text-sm ${getMaintenanceStatusColor(log.status)}`}>
                      {getMaintenanceStatusText(log.status)}
                    </span>
                  </div>
                  <div className="text-gray-300 text-sm mb-1">{log.description}</div>
                  <div className="text-gray-400 text-xs">
                    技術員: {log.technician} · {log.date}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-[#ff880a] hover:text-[#e6770a] text-sm transition-colors">
                    查看詳情
                  </button>
                  {log.status === 'pending' && (
                    <button className="bg-[#ff880a] hover:bg-[#e6770a] text-white px-3 py-1 rounded text-sm transition-colors">
                      開始處理
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 地图图层控制 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <div className="flex items-center space-x-2 mb-4">
          <Map className="w-5 h-5 text-[#ff880a]" />
          <h3 className="text-lg font-semibold text-white">地圖圖層控制</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {layerConfigs.map(layer => (
            <LayerControl
              key={layer.id}
              id={layer.id}
              name={layer.name}
              description={layer.description}
              visible={layerVisibility[layer.id as keyof typeof layerVisibility]}
              onToggle={toggleLayerVisibility}
            />
          ))}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">快速操作</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="bg-[#ff880a] hover:bg-[#e6770a] text-white px-4 py-2 rounded-lg transition-colors text-sm">
            新增維護任務
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
            設備診斷
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
            生成報告
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
            導出數據
          </button>
        </div>
      </div>
    </div>
  );
}