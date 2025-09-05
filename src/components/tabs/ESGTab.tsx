import { useState, useEffect } from 'react';
import { Leaf, Droplets, Wind, Thermometer, Volume2, Trash2, Zap, Users, FileText, Award, TrendingUp, TrendingDown, Cloud, CloudRain, Zap as Lightning, Snowflake, Sun } from 'lucide-react';
import { useMapStore } from '../../store/mapStore';
import { WeatherSignal } from '../../services/WeatherSignalSystem';
import { toast } from 'sonner';
import { useAutoCleanupTimer } from '../../hooks/useCleanup';

interface EnvironmentalMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  target: number;
  icon: any;
}

interface WasteRecord {
  id: string;
  type: 'general' | 'recyclable' | 'organic' | 'hazardous';
  weight: number;
  timestamp: string;
  location: string;
  status: 'collected' | 'pending' | 'processing';
}

interface ComplianceItem {
  id: string;
  category: 'environmental' | 'safety' | 'social' | 'governance';
  title: string;
  description: string;
  status: 'compliant' | 'warning' | 'non-compliant';
  lastAudit: string;
  nextAudit: string;
  responsible: string;
}

interface SustainabilityGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  category: 'energy' | 'water' | 'waste' | 'carbon';
}

export default function ESGTab() {
  const [environmentalMetrics, setEnvironmentalMetrics] = useState<EnvironmentalMetric[]>([
    {
      id: 'iaq',
      name: 'IAQ 等級',
      value: 85,
      unit: '',
      status: 'good',
      trend: 'stable',
      target: 80,
      icon: Wind
    },
    {
      id: 'temperature',
      name: '溫度',
      value: 24.5,
      unit: '°C',
      status: 'good',
      trend: 'stable',
      target: 25,
      icon: Thermometer
    },
    {
      id: 'humidity',
      name: '濕度',
      value: 62,
      unit: '%',
      status: 'good',
      trend: 'down',
      target: 60,
      icon: Droplets
    },
    {
      id: 'noise',
      name: '噪音水平',
      value: 45,
      unit: 'dB',
      status: 'good',
      trend: 'down',
      target: 50,
      icon: Volume2
    },
    {
      id: 'energy',
      name: '能耗指數',
      value: 78,
      unit: 'kWh',
      status: 'warning',
      trend: 'up',
      target: 70,
      icon: Zap
    },
    {
      id: 'water',
      name: '用水量',
      value: 1250,
      unit: 'L',
      status: 'good',
      trend: 'down',
      target: 1300,
      icon: Droplets
    }
  ]);

  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([
    {
      id: 'WR-001',
      type: 'general',
      weight: 45.2,
      timestamp: '2024-01-28 08:30',
      location: '1樓垃圾房',
      status: 'collected'
    },
    {
      id: 'WR-002',
      type: 'recyclable',
      weight: 23.8,
      timestamp: '2024-01-28 08:15',
      location: '地下回收站',
      status: 'collected'
    },
    {
      id: 'WR-003',
      type: 'organic',
      weight: 18.5,
      timestamp: '2024-01-28 07:45',
      location: '廚餘處理區',
      status: 'processing'
    },
    {
      id: 'WR-004',
      type: 'hazardous',
      weight: 2.1,
      timestamp: '2024-01-28 07:30',
      location: '危險品暫存區',
      status: 'pending'
    }
  ]);

  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([
    {
      id: 'CI-001',
      category: 'environmental',
      title: '環境影響評估',
      description: '年度環境影響評估報告',
      status: 'compliant',
      lastAudit: '2024-01-15',
      nextAudit: '2025-01-15',
      responsible: '環境部'
    },
    {
      id: 'CI-002',
      category: 'safety',
      title: '消防安全檢查',
      description: '消防設備及逃生路線檢查',
      status: 'warning',
      lastAudit: '2023-12-20',
      nextAudit: '2024-02-20',
      responsible: '安全部'
    },
    {
      id: 'CI-003',
      category: 'social',
      title: '員工健康安全',
      description: '職業健康安全管理體系',
      status: 'compliant',
      lastAudit: '2024-01-10',
      nextAudit: '2024-07-10',
      responsible: '人力資源部'
    },
    {
      id: 'CI-004',
      category: 'governance',
      title: '數據保護合規',
      description: 'GDPR及個人資料保護',
      status: 'non-compliant',
      lastAudit: '2023-11-30',
      nextAudit: '2024-02-28',
      responsible: 'IT部'
    }
  ]);

  const [sustainabilityGoals, setSustainabilityGoals] = useState<SustainabilityGoal[]>([
    {
      id: 'SG-001',
      title: '減少能源消耗',
      description: '相比去年同期減少15%能源消耗',
      target: 15,
      current: 8.5,
      unit: '%',
      deadline: '2024-12-31',
      category: 'energy'
    },
    {
      id: 'SG-002',
      title: '提高回收率',
      description: '垃圾回收率達到80%',
      target: 80,
      current: 72,
      unit: '%',
      deadline: '2024-06-30',
      category: 'waste'
    },
    {
      id: 'SG-003',
      title: '節約用水',
      description: '減少20%用水量',
      target: 20,
      current: 12,
      unit: '%',
      deadline: '2024-09-30',
      category: 'water'
    },
    {
      id: 'SG-004',
      title: '碳中和目標',
      description: '實現碳排放淨零目標',
      target: 100,
      current: 35,
      unit: '%',
      deadline: '2025-12-31',
      category: 'carbon'
    }
  ]);

  const { weatherState, setWeatherSignal } = useMapStore();

  const weatherSignalOptions: { signal: WeatherSignal; label: string; icon: any; description: string }[] = [
    { signal: WeatherSignal.NORMAL, label: '正常天氣', icon: Sun, description: '天氣狀況良好' },
    { signal: WeatherSignal.T1, label: 'T1信號', icon: Wind, description: '一號颱風信號' },
    { signal: WeatherSignal.T3, label: 'T3信號', icon: Wind, description: '三號颱風信號' },
    { signal: WeatherSignal.T8, label: 'T8信號', icon: Wind, description: '八號颱風信號' },
    { signal: WeatherSignal.T10, label: 'T10信號', icon: Wind, description: '十號颱風信號' },
    { signal: WeatherSignal.AMBER, label: '黃色暴雨', icon: CloudRain, description: '黃色暴雨警告' },
    { signal: WeatherSignal.RED, label: '紅色暴雨', icon: CloudRain, description: '紅色暴雨警告' },
    { signal: WeatherSignal.BLACK, label: '黑色暴雨', icon: CloudRain, description: '黑色暴雨警告' }
  ];

  const handleWeatherSignalChange = (signal: WeatherSignal) => {
    setWeatherSignal(signal);
    const option = weatherSignalOptions.find(opt => opt.signal === signal);
    toast.success(`天氣信號已切換至: ${option?.label}`);
  };

  const getWeatherSignalColor = (signal: WeatherSignal) => {
    switch (signal) {
      case WeatherSignal.NORMAL: return 'text-green-400 bg-green-400/20';
      case WeatherSignal.T1: return 'text-blue-400 bg-blue-400/20';
      case WeatherSignal.T3: return 'text-yellow-400 bg-yellow-400/20';
      case WeatherSignal.T8: return 'text-orange-400 bg-orange-400/20';
      case WeatherSignal.T10: return 'text-red-400 bg-red-400/20';
      case WeatherSignal.AMBER: return 'text-yellow-400 bg-yellow-400/20';
      case WeatherSignal.RED: return 'text-red-400 bg-red-400/20';
      case WeatherSignal.BLACK: return 'text-gray-900 bg-gray-900/80 text-white';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  // 更新环境指标数据
  const updateEnvironmentalMetrics = () => {
    setEnvironmentalMetrics(prev => prev.map(metric => {
      const change = (Math.random() - 0.5) * 2; // -1 to +1
      let newValue = metric.value + change;
      
      // 确保值在合理范围内
      if (metric.id === 'temperature') {
        newValue = Math.max(20, Math.min(30, newValue));
      } else if (metric.id === 'humidity') {
        newValue = Math.max(40, Math.min(80, newValue));
      } else if (metric.id === 'iaq') {
        newValue = Math.max(60, Math.min(100, newValue));
      } else if (metric.id === 'noise') {
        newValue = Math.max(35, Math.min(60, newValue));
      } else if (metric.id === 'energy') {
        newValue = Math.max(50, Math.min(100, newValue));
      } else if (metric.id === 'water') {
        newValue = Math.max(1000, Math.min(1500, newValue));
      }
      
      const trend = newValue > metric.value ? 'up' : newValue < metric.value ? 'down' : 'stable';
      let status: 'good' | 'warning' | 'critical' = 'good';
      
      if (metric.id === 'energy' && newValue > metric.target * 1.1) {
        status = 'warning';
      } else if (metric.id === 'noise' && newValue > metric.target) {
        status = 'warning';
      } else if (newValue > metric.target * 1.2) {
        status = 'critical';
      }
      
      return {
        ...metric,
        value: Math.round(newValue * 10) / 10,
        trend,
        status
      };
    }));
  };

  // 使用自动清理定时器进行实时数据更新
  useAutoCleanupTimer('ESGTab', updateEnvironmentalMetrics, 8000, true);

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400 bg-green-400/20';
      case 'warning': return 'text-yellow-400 bg-yellow-400/20';
      case 'critical': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-400 bg-green-400/20';
      case 'warning': return 'text-yellow-400 bg-yellow-400/20';
      case 'non-compliant': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getComplianceStatusText = (status: string) => {
    switch (status) {
      case 'compliant': return '合規';
      case 'warning': return '警告';
      case 'non-compliant': return '不合規';
      default: return '未知';
    }
  };

  const getWasteTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'text-gray-400 bg-gray-400/20';
      case 'recyclable': return 'text-green-400 bg-green-400/20';
      case 'organic': return 'text-yellow-400 bg-yellow-400/20';
      case 'hazardous': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getWasteTypeText = (type: string) => {
    switch (type) {
      case 'general': return '一般垃圾';
      case 'recyclable': return '可回收';
      case 'organic': return '廚餘';
      case 'hazardous': return '危險品';
      default: return '未知';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'energy': return 'text-yellow-400 bg-yellow-400/20';
      case 'water': return 'text-blue-400 bg-blue-400/20';
      case 'waste': return 'text-green-400 bg-green-400/20';
      case 'carbon': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };



  return (
    <div className="space-y-6">
      {/* ESG概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-green-400">
            {environmentalMetrics.filter(m => m.status === 'good').length}
          </div>
          <div className="text-sm text-gray-400">環境指標良好</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-blue-400">
            {complianceItems.filter(c => c.status === 'compliant').length}
          </div>
          <div className="text-sm text-gray-400">合規項目</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-yellow-400">
            {wasteRecords.filter(w => w.status === 'collected').length}
          </div>
          <div className="text-sm text-gray-400">今日垃圾清運</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-white">
            {Math.round(sustainabilityGoals.reduce((acc, goal) => acc + (goal.current / goal.target * 100), 0) / sustainabilityGoals.length)}%
          </div>
          <div className="text-sm text-gray-400">可持續目標進度</div>
        </div>
      </div>

      {/* 环境监测 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">環境監測</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {environmentalMetrics.map(metric => {
            const IconComponent = metric.icon;
            return (
              <div key={metric.id} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">{metric.name}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs ${getMetricStatusColor(metric.status)}`}>
                    {metric.status === 'good' ? '良好' : metric.status === 'warning' ? '警告' : '嚴重'}
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-white">
                    {metric.value}{metric.unit}
                  </span>
                  <div className="flex items-center space-x-1">
                    {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-400" />}
                    {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-400" />}
                    {metric.trend === 'stable' && <div className="w-4 h-4 bg-gray-400 rounded-full"></div>}
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  目標: {metric.target}{metric.unit}
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metric.status === 'good' ? 'bg-green-400' : 
                      metric.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (metric.value / (metric.target * 1.2)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 天气信号和垃圾清运 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 天气信号控制面板 */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">天氣信號控制面板</h3>
          
          {/* 当前信号状态 */}
          <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">當前信號</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getWeatherSignalColor(weatherState.currentSignal)}`}>
                {weatherSignalOptions.find(opt => opt.signal === weatherState.currentSignal)?.label}
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              {weatherSignalOptions.find(opt => opt.signal === weatherState.currentSignal)?.description}
            </div>
            {weatherState.isEmergencyActive && (
              <div className="mt-2 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                緊急狀態 - 自動應急響應已啟動
              </div>
            )}
          </div>

          {/* 信号选择按钮 */}
          <div className="space-y-2">
            <div className="text-white text-sm font-medium mb-2">選擇天氣信號:</div>
            <div className="grid grid-cols-2 gap-2">
              {weatherSignalOptions.map(option => {
                const IconComponent = option.icon;
                const isActive = weatherState.currentSignal === option.signal;
                return (
                  <button
                    key={option.signal}
                    onClick={() => handleWeatherSignalChange(option.signal)}
                    className={`p-2 rounded-lg border transition-all duration-200 flex items-center space-x-2 ${
                      isActive 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 统计信息 */}
          {weatherState.statistics && (
            <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
              <div className="text-white text-sm font-medium mb-2">統計信息</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>持續時間: {Math.round(weatherState.statistics.duration / 60)}分鐘</div>
                <div>受影響區域: {weatherState.statistics.affectedAreas.length}個</div>
                <div>信號變更: {weatherState.statistics.signalChanges}次</div>
                <div>緊急響應: {weatherState.statistics.emergencyResponses}次</div>
              </div>
            </div>
          )}
        </div>

        {/* 垃圾清运 */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">垃圾清運記錄</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {wasteRecords.map(record => (
              <div key={record.id} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${getWasteTypeColor(record.type)}`}>
                    {getWasteTypeText(record.type)}
                  </span>
                  <span className="text-white font-semibold">{record.weight} kg</span>
                </div>
                <div className="text-gray-400 text-xs mb-1">
                  {record.location} · {record.timestamp}
                </div>
                <div className="text-gray-400 text-xs">
                  狀態: {record.status === 'collected' ? '已清運' : 
                         record.status === 'pending' ? '待清運' : '處理中'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 合规管理和可持续发展目标 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 合规管理 */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">合規管理</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {complianceItems.map(item => (
              <div key={item.id} className="bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{item.title}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getComplianceStatusColor(item.status)}`}>
                    {getComplianceStatusText(item.status)}
                  </span>
                </div>
                <div className="text-gray-400 text-sm mb-2">{item.description}</div>
                <div className="text-gray-400 text-xs">
                  負責部門: {item.responsible}
                </div>
                <div className="text-gray-400 text-xs">
                  上次審核: {item.lastAudit} | 下次審核: {item.nextAudit}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 可持续发展目标 */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">可持續發展目標</h3>
          <div className="space-y-4">
            {sustainabilityGoals.map(goal => {
              const progress = (goal.current / goal.target) * 100;
              return (
                <div key={goal.id} className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{goal.title}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(goal.category)}`}>
                      {goal.category.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm mb-2">{goal.description}</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">
                      {goal.current}{goal.unit} / {goal.target}{goal.unit}
                    </span>
                    <span className="text-gray-400 text-xs">截止: {goal.deadline}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        progress >= 100 ? 'bg-green-400' : 
                        progress >= 75 ? 'bg-blue-400' : 
                        progress >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {Math.round(progress)}% 完成
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">快速操作</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
            <Leaf className="w-4 h-4" />
            <span className="text-sm">環境報告</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm">合規檢查</span>
          </button>
          <button className="bg-yellow-600 hover:bg-yellow-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
            <Award className="w-4 h-4" />
            <span className="text-sm">ESG評級</span>
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">社會責任</span>
          </button>
        </div>
      </div>
    </div>
  );
}