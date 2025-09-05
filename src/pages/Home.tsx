import { useState, useEffect } from 'react';
import MapboxMap from '../components/MapboxMap';
import TopBar from '../components/TopBar';
import DrawerPanel from '../components/DrawerPanel';
import BottomTicker from '../components/BottomTicker';
import SettingsModal from '../components/SettingsModal';
import FadeTransition from '../components/FadeTransition';
import PerformancePanel from '../components/PerformancePanel';
import StabilityTestPanel from '../components/StabilityTestPanel';
import LongRunningTestPanel from '../components/LongRunningTestPanel';
import MemoryManagementTestPanel from '../components/MemoryManagementTestPanel';
import { useLoadingStore } from '../store/loadingStore';
import { useFeedbackStore } from '../stores/feedbackStore';
import { useTimerManager } from '../hooks/useCleanup';

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [showStabilityPanel, setShowStabilityPanel] = useState(false);
  const [showLongRunningTestPanel, setShowLongRunningTestPanel] = useState(false);
  const [showMemoryTestPanel, setShowMemoryTestPanel] = useState(false);
  const { addLoadingTask, removeLoadingTask } = useLoadingStore();
  const { showFeedback } = useFeedbackStore();
  const { setTimeout } = useTimerManager();

  // 页面加载时显示加载状态
  useEffect(() => {
    const taskId = 'home-init';
    addLoadingTask(taskId, '正在初始化应用...');
    
    // 模拟初始化过程
    setTimeout(() => {
      removeLoadingTask(taskId);
      showFeedback('应用初始化完成', 'success');
    }, 1500);
    
    return () => {
      removeLoadingTask(taskId);
    };
  }, [addLoadingTask, removeLoadingTask, setTimeout]);

  const handleSettingsSave = (settings: any) => {
    console.log('Settings saved:', settings);
    showFeedback('设置已保存', 'success');
    // 这里可以添加设置保存后的逻辑，比如重新初始化地图等
  };
  
  const handleMapReady = (map: any) => {
    console.log('地图已准备就绪:', map);
    setMapReady(true);
    showFeedback('地图加载完成', 'success');
  };

  return (
    <div className="h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* 全屏地图容器 */}
      <FadeTransition isVisible={true} duration={0.5} className="absolute inset-0">
        <MapboxMap onMapReady={handleMapReady} />
      </FadeTransition>

      {/* 顶部导航栏 */}
      <FadeTransition isVisible={true} duration={0.3} delay={0.2} direction="down">
        <TopBar 
          onMenuClick={() => setDrawerOpen(!drawerOpen)}
          onSettingsClick={() => setSettingsOpen(true)}
          isDrawerOpen={drawerOpen}
        />
      </FadeTransition>

      {/* 右侧抽屉面板 */}
      <DrawerPanel 
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* 底部状态栏和跑马灯 */}
      <FadeTransition isVisible={mapReady} duration={0.3} delay={0.4} direction="up">
        <BottomTicker className="pb-0" />
      </FadeTransition>

      {/* 设置模态框 */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      {/* 性能监控面板 */}
      <PerformancePanel 
        isVisible={showPerformancePanel}
        onToggle={() => setShowPerformancePanel(!showPerformancePanel)}
      />

      {/* 稳定性测试面板 */}
        {showStabilityPanel && (
          <div className="absolute top-4 left-4 z-50 w-96 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <StabilityTestPanel />
          </div>
        )}

        {/* 长时间运行测试面板 */}
        {showLongRunningTestPanel && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-[32rem] max-h-[calc(100vh-2rem)] overflow-y-auto">
            <LongRunningTestPanel />
          </div>
        )}

        {/* 内存管理测试面板 */}
        {showMemoryTestPanel && (
          <MemoryManagementTestPanel onClose={() => setShowMemoryTestPanel(false)} />
        )}



      {/* 控制面板按钮组 */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        {/* 性能面板切换按钮 */}
        <button
          onClick={() => setShowPerformancePanel(!showPerformancePanel)}
          className="bg-gray-800/80 backdrop-blur-sm text-white p-2 rounded-lg shadow-lg hover:bg-gray-700/80 transition-colors"
          title="性能监控"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
        
        {/* 稳定性测试面板切换按钮 */}
        <button
          onClick={() => setShowStabilityPanel(!showStabilityPanel)}
          className="bg-gray-800/80 backdrop-blur-sm text-white p-2 rounded-lg shadow-lg hover:bg-gray-700/80 transition-colors"
          title="稳定性测试"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>

      </div>
    </div>
  );
}