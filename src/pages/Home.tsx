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
import { useMapStore } from '../store/mapStore';
import { useThemeStore } from '../store/themeStore';

export default function Home() {
  const { uiState, setDrawerOpen, setDrawerActiveTab } = useMapStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [showStabilityPanel] = useState(false);
  const [showLongRunningTestPanel] = useState(false);
  const [showMemoryTestPanel, setShowMemoryTestPanel] = useState(false);
  const { addLoadingTask, removeLoadingTask } = useLoadingStore();
  const { showFeedback } = useFeedbackStore();
  const { setTimeout } = useTimerManager();
  const { setTheme } = useThemeStore();

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
    // 应用主题设置
    if (settings.theme) {
      setTheme(settings.theme);
    }
    showFeedback('设置已保存', 'success');
    // 这里可以添加设置保存后的逻辑，比如重新初始化地图等
  };
  
  const handleMapReady = (map: any) => {
    console.log('Home: 地图已准备就绪:', map);
    setMapReady(true);
    showFeedback('地图加载完成', 'success');
  };

  console.log('Home: 组件渲染，mapReady:', mapReady);

  return (
    <div className="h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* 全屏地图容器 */}
      <div className="absolute inset-0">
        <MapboxMap onMapReady={handleMapReady} />
      </div>

      {/* 顶部导航栏 */}
      <FadeTransition isVisible={true} duration={0.3} delay={0.2} direction="down">
        <TopBar 
          onMenuClick={() => setDrawerOpen(!uiState.drawerOpen)}
          onSettingsClick={() => setSettingsOpen(true)}
          isDrawerOpen={uiState.drawerOpen}
        />
      </FadeTransition>

      {/* 右侧抽屉面板 */}
      <DrawerPanel 
        isOpen={uiState.drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={uiState.drawerActiveTab}
        setActiveTab={setDrawerActiveTab}
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
    </div>
  );
}