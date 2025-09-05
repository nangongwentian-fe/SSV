import React, { useState, useEffect } from 'react';
import { Play, Pause, Settings, AlertTriangle, CheckCircle, Clock, Zap, Users, Shield, Thermometer, Bus } from 'lucide-react';
import { useMapStore } from '../../store/mapStore';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: 'active' | 'inactive' | 'triggered';
  lastTriggered: string;
  triggerCount: number;
}

interface Event {
  id: string;
  type: 'security' | 'environmental' | 'system' | 'emergency';
  title: string;
  description: string;
  location: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'investigating';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
}

export default function EventsTab() {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: 'RULE-001',
      name: '夜間安防模式',
      trigger: '時間 >= 22:00',
      action: '啟動全部CCTV + 鎖定所有出入口',
      status: 'active',
      lastTriggered: '2024-01-27 22:00',
      triggerCount: 15
    },
    {
      id: 'RULE-002',
      name: '溫度異常處理',
      trigger: '溫度 > 30°C',
      action: '啟動空調系統 + 發送警報',
      status: 'active',
      lastTriggered: '2024-01-26 14:30',
      triggerCount: 3
    },
    {
      id: 'RULE-003',
      name: '人流高峰管制',
      trigger: '人流密度 > 80%',
      action: '開啟額外電梯 + 廣播疏導',
      status: 'triggered',
      lastTriggered: '2024-01-28 08:45',
      triggerCount: 8
    },
    {
      id: 'RULE-004',
      name: '緊急疏散',
      trigger: '火警警報觸發',
      action: '開啟所有出口 + 緊急廣播 + 通知消防',
      status: 'inactive',
      lastTriggered: '從未觸發',
      triggerCount: 0
    },
    {
      id: 'RULE-005',
      name: '節能模式',
      trigger: '人流密度 < 20% AND 時間 > 20:00',
      action: '關閉部分照明 + 降低空調功率',
      status: 'active',
      lastTriggered: '2024-01-27 20:15',
      triggerCount: 12
    }
  ]);

  const [events, setEvents] = useState<Event[]>([
    {
      id: 'EVT-001',
      type: 'security',
      title: '異常人員進入',
      description: 'CCTV-03檢測到未授權人員進入限制區域',
      location: '地下停車場B區',
      timestamp: '2024-01-28 09:15',
      status: 'investigating',
      priority: 'high',
      assignee: '保安隊長'
    },
    {
      id: 'EVT-002',
      type: 'environmental',
      title: '空氣質量異常',
      description: 'IAQ傳感器檢測到PM2.5濃度超標',
      location: '15樓辦公區',
      timestamp: '2024-01-28 08:30',
      status: 'active',
      priority: 'medium',
      assignee: '設施管理員'
    },
    {
      id: 'EVT-003',
      type: 'system',
      title: '電梯故障',
      description: '電梯B發生機械故障，已自動停止運行',
      location: '電梯B (1-20樓)',
      timestamp: '2024-01-28 07:45',
      status: 'resolved',
      priority: 'high',
      assignee: '維修技師'
    },
    {
      id: 'EVT-004',
      type: 'emergency',
      title: '火警警報測試',
      description: '定期火警系統測試，預計持續30分鐘',
      location: '全棟建築',
      timestamp: '2024-01-28 10:00',
      status: 'active',
      priority: 'low',
      assignee: '消防管理員'
    }
  ]);

  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [crowdFlowStats, setCrowdFlowStats] = useState({
    total: 0,
    mtr: 0,
    taxi: 0,
    runway: 0,
    completed: 0,
    inProgress: 0,
    estimatedTime: 0
  });
  const [shuttleBusStats, setShuttleBusStats] = useState({
    totalBuses: 0,
    activeBuses: 0,
    totalPassengers: 0,
    tripsCompleted: 0,
    averageWaitTime: 0,
    onTimePerformance: 0
  });
  
  // 使用状态管理中的动画系统
  const { 
    animationState, 
    crowdFlowSimulator, 
    shuttleBusSystem, 
    toggleCrowdFlow, 
    togglePatrol, 
    toggleShuttleBus 
  } = useMapStore();

  const getRuleStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20';
      case 'inactive': return 'text-gray-400 bg-gray-400/20';
      case 'triggered': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getRuleStatusText = (status: string) => {
    switch (status) {
      case 'active': return '啟用中';
      case 'inactive': return '已停用';
      case 'triggered': return '已觸發';
      default: return '未知';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'environmental': return <Thermometer className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'security': return 'text-blue-400 bg-blue-400/20';
      case 'environmental': return 'text-green-400 bg-green-400/20';
      case 'system': return 'text-purple-400 bg-purple-400/20';
      case 'emergency': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400';
      case 'investigating': return 'text-yellow-400';
      case 'resolved': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const toggleRule = (ruleId: string) => {
    setAutomationRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          status: rule.status === 'active' ? 'inactive' : 'active'
        };
      }
      return rule;
    }));
  };

  const updateEventStatus = (eventId: string, newStatus: Event['status']) => {
    setEvents(prev => prev.map(event => {
      if (event.id === eventId) {
        return { ...event, status: newStatus };
      }
      return event;
    }));
  };

  useEffect(() => {
    // 设置人流模拟统计回调
    if (crowdFlowSimulator) {
      crowdFlowSimulator.setStatisticsUpdateCallback(setCrowdFlowStats);
    }
    
    // 设置穿梭巴士统计回调
    if (shuttleBusSystem) {
      shuttleBusSystem.setStatisticsUpdateCallback(setShuttleBusStats);
    }
  }, [crowdFlowSimulator, shuttleBusSystem]);

  const handleCrowdFlowToggle = () => {
    toggleCrowdFlow();
  };

  const handleShuttleBusToggle = () => {
    toggleShuttleBus();
  };

  return (
    <div className="space-y-6">
      {/* 活动统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-green-400">3</div>
          <div className="text-sm text-gray-400">啟用規則</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-yellow-400">1</div>
          <div className="text-sm text-gray-400">已觸發</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-red-400">2</div>
          <div className="text-sm text-gray-400">活躍事件</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <div className="text-2xl font-bold text-white">38</div>
          <div className="text-sm text-gray-400">今日觸發</div>
        </div>
      </div>

      {/* 自动化规则 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">自動化規則</h3>
        <div className="space-y-3">
          {automationRules.map(rule => (
            <div key={rule.id} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-white font-medium">{rule.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getRuleStatusColor(rule.status)}`}>
                      {getRuleStatusText(rule.status)}
                    </span>
                  </div>
                  <div className="text-gray-300 text-sm mb-1">
                    <span className="text-gray-400">觸發條件:</span> {rule.trigger}
                  </div>
                  <div className="text-gray-300 text-sm mb-2">
                    <span className="text-gray-400">執行動作:</span> {rule.action}
                  </div>
                  <div className="text-gray-400 text-xs">
                    最後觸發: {rule.lastTriggered} · 觸發次數: {rule.triggerCount}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => toggleRule(rule.id)}
                    className={`p-2 rounded transition-colors ${
                      rule.status === 'active' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title={rule.status === 'active' ? '停用' : '啟用'}
                  >
                    {rule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setSelectedRule(rule.id)}
                    className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                    title="設置"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 实时事件 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">實時事件</h3>
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getEventTypeColor(event.type)}`}>
                      {getEventTypeIcon(event.type)}
                      <span className="capitalize">{event.type}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(event.priority)}`}>
                      {event.priority.toUpperCase()}
                    </span>
                    <span className={`text-sm ${getStatusColor(event.status)}`}>
                      {event.status === 'active' ? '進行中' : 
                       event.status === 'investigating' ? '調查中' : '已解決'}
                    </span>
                  </div>
                  <div className="text-white font-medium mb-1">{event.title}</div>
                  <div className="text-gray-300 text-sm mb-2">{event.description}</div>
                  <div className="text-gray-400 text-xs">
                    位置: {event.location} · 時間: {event.timestamp}
                    {event.assignee && ` · 負責人: ${event.assignee}`}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {event.status === 'active' && (
                    <button 
                      onClick={() => updateEventStatus(event.id, 'investigating')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      開始調查
                    </button>
                  )}
                  {event.status === 'investigating' && (
                    <button 
                      onClick={() => updateEventStatus(event.id, 'resolved')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      標記解決
                    </button>
                  )}
                  <button className="text-[#ff880a] hover:text-[#e6770a] text-sm transition-colors">
                    查看詳情
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 动画控制 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">動畫控制</h3>
        
        {/* 人流散场控制 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">演唱會散場模擬</span>
            </div>
            <button
              onClick={handleCrowdFlowToggle}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                animationState.isCrowdFlowActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {animationState.isCrowdFlowActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{animationState.isCrowdFlowActive ? '停止散場' : '開始散場'}</span>
            </button>
          </div>
          
          {animationState.isCrowdFlowActive && (
            <div className="grid grid-cols-3 gap-4 bg-gray-700/30 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{crowdFlowStats.total}</div>
                <div className="text-xs text-gray-400">總人數</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{crowdFlowStats.completed}</div>
                <div className="text-xs text-gray-400">已離場</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400">{crowdFlowStats.inProgress}</div>
                <div className="text-xs text-gray-400">剩餘人數</div>
              </div>
            </div>
          )}
        </div>
        
        {/* 穿梭巴士控制 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Bus className="w-5 h-5 text-orange-400" />
              <span className="text-white font-medium">穿梭巴士服務</span>
            </div>
            <button
              onClick={handleShuttleBusToggle}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                animationState.isShuttleBusActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {animationState.isShuttleBusActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{animationState.isShuttleBusActive ? '停止服務' : '開始服務'}</span>
            </button>
          </div>
          
          {animationState.isShuttleBusActive && (
            <div className="grid grid-cols-3 gap-4 bg-gray-700/30 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{shuttleBusStats.activeBuses}</div>
                <div className="text-xs text-gray-400">運行巴士</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{shuttleBusStats.totalPassengers}</div>
                <div className="text-xs text-gray-400">載客人數</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{shuttleBusStats.tripsCompleted}</div>
                <div className="text-xs text-gray-400">完成班次</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">快速操作</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="bg-[#ff880a] hover:bg-[#e6770a] text-white px-4 py-2 rounded-lg transition-colors text-sm">
            新增規則
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
            事件統計
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
            規則測試
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
            導出日誌
          </button>
        </div>
      </div>
    </div>
  );
}