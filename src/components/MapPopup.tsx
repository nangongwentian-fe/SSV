import React from 'react';
import { X, Camera, Thermometer, Droplets, Trash2, Shield, AlertTriangle, MapPin, Activity } from 'lucide-react';
import { SensorData, CCTVCamera, FlowData, IAQData, BinData, FloodRiskData, PatrolData } from '../types';

interface MapPopupProps {
  data: any;
  layerType: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const MapPopup: React.FC<MapPopupProps> = ({ data, layerType, position, onClose }) => {
  const renderContent = () => {
    switch (layerType) {
      case 'sensors':
        return <SensorPopupContent data={data as SensorData} />;
      case 'cctv':
        return <CCTVPopupContent data={data as CCTVCamera} />;
      case 'heatmap':
        return <FlowPopupContent data={data as FlowData} />;
      case 'iaq':
        return <IAQPopupContent data={data as IAQData} />;
      case 'bins':
        return <BinPopupContent data={data as BinData} />;
      case 'flood':
        return <FloodPopupContent data={data as FloodRiskData} />;
      case 'patrol':
        return <PatrolPopupContent data={data as PatrolData} />;
      default:
        return <DefaultPopupContent data={data} />;
    }
  };

  return (
    <div 
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-64 max-w-80"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {getPopupTitle(layerType)}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-3">
        {renderContent()}
      </div>
    </div>
  );
};

// 传感器弹窗内容
const SensorPopupContent: React.FC<{ data: SensorData }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Thermometer size={16} className="text-blue-500" />
      <span className="text-sm font-medium">传感器 {data.id}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500 dark:text-gray-400">类型:</span>
        <span className="ml-1">{data.type}</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">状态:</span>
        <span className={`ml-1 ${data.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
          {data.status === 'online' ? '在线' : '离线'}
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">数值:</span>
        <span className="ml-1">{data.value} {data.unit}</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">更新:</span>
        <span className="ml-1">{new Date(data.lastUpdate).toLocaleTimeString()}</span>
      </div>
    </div>
    {data.location && (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        位置: {data.location}
      </div>
    )}
  </div>
);

// CCTV弹窗内容
const CCTVPopupContent: React.FC<{ data: CCTVCamera }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Camera size={16} className="text-purple-500" />
      <span className="text-sm font-medium">摄像头 {data.id}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500 dark:text-gray-400">状态:</span>
        <span className={`ml-1 ${data.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
          {data.status === 'online' ? '在线' : '离线'}
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">分辨率:</span>
        <span className="ml-1">{data.resolution}</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">视角:</span>
        <span className="ml-1">{data.viewAngle}°</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">夜视:</span>
        <span className="ml-1">{data.nightVision ? '支持' : '不支持'}</span>
      </div>
    </div>
    {data.location && (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        位置: {data.location}
      </div>
    )}
    <div className="text-xs text-gray-500 dark:text-gray-400">
      最后更新: {new Date(data.lastUpdate).toLocaleString()}
    </div>
  </div>
);

// 人流弹窗内容
const FlowPopupContent: React.FC<{ data: FlowData }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Activity size={16} className="text-orange-500" />
      <span className="text-sm font-medium">人流监测点</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500 dark:text-gray-400">密度:</span>
        <span className={`ml-1 ${
          data.density > 0.8 ? 'text-red-600' : 
          data.density > 0.5 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {(data.density * 100).toFixed(0)}%
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">速度:</span>
        <span className="ml-1">{data.speed.toFixed(1)} m/s</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">方向:</span>
        <span className="ml-1">{data.direction}°</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">类型:</span>
        <span className="ml-1">{data.type}</span>
      </div>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">
      路径长度: {data.path.length} 个点
    </div>
  </div>
);

// IAQ弹窗内容
const IAQPopupContent: React.FC<{ data: IAQData }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Droplets size={16} className="text-cyan-500" />
      <span className="text-sm font-medium">空气质量监测</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500 dark:text-gray-400">PM2.5:</span>
        <span className={`ml-1 ${
          data.pm25 > 75 ? 'text-red-600' : 
          data.pm25 > 35 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {data.pm25} μg/m³
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">PM10:</span>
        <span className="ml-1">{data.pm10} μg/m³</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">温度:</span>
        <span className="ml-1">{data.temperature}°C</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">湿度:</span>
        <span className="ml-1">{data.humidity}%</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">AQI:</span>
        <span className={`ml-1 ${
          data.aqi > 150 ? 'text-red-600' : 
          data.aqi > 100 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {data.aqi}
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">等级:</span>
        <span className="ml-1">{data.level}</span>
      </div>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">
      最后更新: {new Date(data.lastUpdate).toLocaleString()}
    </div>
  </div>
);

// 垃圾桶弹窗内容
const BinPopupContent: React.FC<{ data: BinData }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Trash2 size={16} className="text-green-500" />
      <span className="text-sm font-medium">智能垃圾桶 {data.id}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500 dark:text-gray-400">类型:</span>
        <span className="ml-1">{data.type}</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">容量:</span>
        <span className={`ml-1 ${
          data.fillLevel > 0.8 ? 'text-red-600' : 
          data.fillLevel > 0.6 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {(data.fillLevel * 100).toFixed(0)}%
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">状态:</span>
        <span className={`ml-1 ${data.status === 'normal' ? 'text-green-600' : 'text-red-600'}`}>
          {data.status === 'normal' ? '正常' : data.status === 'full' ? '已满' : '故障'}
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">温度:</span>
        <span className="ml-1">{data.temperature}°C</span>
      </div>
    </div>
    {data.lastCollection && (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        上次清运: {new Date(data.lastCollection).toLocaleString()}
      </div>
    )}
    <div className="text-xs text-gray-500 dark:text-gray-400">
      最后更新: {new Date(data.lastUpdate).toLocaleString()}
    </div>
  </div>
);

// 内涝风险弹窗内容
const FloodPopupContent: React.FC<{ data: FloodRiskData }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <AlertTriangle size={16} className="text-blue-500" />
      <span className="text-sm font-medium">内涝风险监测</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500 dark:text-gray-400">风险等级:</span>
        <span className={`ml-1 ${
          data.riskLevel === '高' ? 'text-red-600' :
          data.riskLevel === '中' ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {data.riskLevel}
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">水位:</span>
        <span className="ml-1">{data.waterLevel} cm</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">水位:</span>
        <span className="ml-1">{data.waterLevel} cm</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">状态:</span>
        <span className={`ml-1 ${
          data.status === '红' ? 'text-red-600' :
          data.status === '橙' ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {data.status === '红' ? '警告' : data.status === '橙' ? '注意' : '正常'}
        </span>
      </div>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
      区域ID: {data.id}
    </div>
  </div>
);

// 巡更弹窗内容
const PatrolPopupContent: React.FC<{ data: PatrolData }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Shield size={16} className="text-indigo-500" />
      <span className="text-sm font-medium">安保巡更 {data.id}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-500 dark:text-gray-400">巡更员:</span>
        <span className="ml-1">{data.guardName}</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">状态:</span>
        <span className={`ml-1 ${data.status === '巡逻中' ? 'text-green-600' : 'text-gray-600'}`}>
          {data.status === '巡逻中' ? '巡更中' : data.status === '休息' ? '休息' : '离线'}
        </span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">位置:</span>
        <span className="ml-1">{data.currentPosition ? `${data.currentPosition[0].toFixed(4)}, ${data.currentPosition[1].toFixed(4)}` : '未知'}</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">进度:</span>
        <span className="ml-1">{((data.progress || 0) * 100).toFixed(0)}%</span>
      </div>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">
      路线: {data.route.length} 个检查点
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">
      巡逻进度: {((data.progress || 0) * 100).toFixed(0)}% 完成
    </div>
  </div>
);

// 默认弹窗内容
const DefaultPopupContent: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <MapPin size={16} className="text-gray-500" />
      <span className="text-sm font-medium">地图标记</span>
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-400">
      {data.name || data.id || '未知标记'}
    </div>
    {data.description && (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {data.description}
      </div>
    )}
  </div>
);

// 获取弹窗标题
const getPopupTitle = (layerType: string): string => {
  const titles: Record<string, string> = {
    sensors: '传感器信息',
    cctv: 'CCTV摄像头',
    heatmap: '人流监测',
    shuttle: '穿梭巴士',
    concert: '演唱会散场',
    runway: 'Runway 1331',
    iaq: '空气质量',
    bins: '垃圾桶状态',
    flood: '内涝风险',
    fence: '电子围栏',
    patrol: '安保巡更'
  };
  return titles[layerType] || '详细信息';
};

export default MapPopup;