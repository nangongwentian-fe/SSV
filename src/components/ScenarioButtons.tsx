import { Play, Music, AlertTriangle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMapStore } from '../store/mapStore';
import { toast } from 'sonner';
import { useFeedbackStore } from '../store/feedbackStore';
import { ScenarioMode } from '../services/ScenarioManager';

export default function ScenarioButtons() {
  const { 
    scenarioState, 
    activateDemoMode, 
    activateConcertMode, 
    activateTyphoonMode, 
    resetToNormalMode,
    openDrawerWithTab
  } = useMapStore();

  const { showFeedback } = useFeedbackStore();

  const handleDemoMode = () => {
    activateDemoMode();
    showFeedback('success', '已切換至演示模式');
  };

  const handleConcertMode = () => {
    // 打开抽屉面板并切换到事件标签页
    openDrawerWithTab('events');
    // 激活演唱会模式
    activateConcertMode();
    showFeedback('success', '已切換至演唱會模式');
  };

  const handleTyphoonMode = () => {
    activateTyphoonMode();
    showFeedback('warning', '已切換至T8颱風模式');
  };

  const handleNormalMode = () => {
    resetToNormalMode();
    showFeedback('info', '已重置為正常模式');
  };

  const getScenarioIcon = (mode: string) => {
    switch (mode) {
      case ScenarioMode.DEMO:
        return <Play className="w-4 h-4" />;
      case ScenarioMode.CONCERT:
        return <Music className="w-4 h-4" />;
      case ScenarioMode.TYPHOON:
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <RotateCcw className="w-4 h-4" />;
    }
  };

  const getButtonClass = (mode: string) => {
    const isActive = scenarioState.currentMode === mode;
    const baseClass = "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2";
    
    if (isActive) {
      switch (mode) {
        case ScenarioMode.DEMO:
          return `${baseClass} bg-blue-600 text-white shadow-lg`;
        case ScenarioMode.CONCERT:
          return `${baseClass} bg-purple-600 text-white shadow-lg`;
        case ScenarioMode.TYPHOON:
          return `${baseClass} bg-red-600 text-white shadow-lg`;
        default:
          return `${baseClass} bg-gray-600 text-white shadow-lg`;
      }
    }
    
    return `${baseClass} bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white`;
  };

  return (
    <div className="flex items-center space-x-2">
      {/* 演示模式 */}
      <motion.button
        onClick={handleDemoMode}
        className={getButtonClass('DEMO')}
        disabled={scenarioState.isTransitioning}
        title="一鍵演示模式"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <Play className="w-4 h-4" />
        <span className="hidden sm:inline">演示</span>
      </motion.button>

      {/* 演唱会模式 */}
      <motion.button
        onClick={handleConcertMode}
        className={getButtonClass('CONCERT')}
        disabled={scenarioState.isTransitioning}
        title="演唱會模式"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <Music className="w-4 h-4" />
        <span className="hidden sm:inline">演唱會</span>
      </motion.button>

      {/* T8台风模式 */}
      <motion.button
        onClick={handleTyphoonMode}
        className={getButtonClass('TYPHOON')}
        disabled={scenarioState.isTransitioning}
        title="T8颱風模式"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="hidden sm:inline">T8</span>
      </motion.button>

      {/* 重置按钮 */}
      <AnimatePresence>
        {scenarioState.currentMode !== ScenarioMode.NORMAL && (
          <motion.button
            onClick={handleNormalMode}
            className={getButtonClass('NORMAL')}
            disabled={scenarioState.isTransitioning}
            title="重置為正常模式"
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline">重置</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 转换状态指示器 */}
      <AnimatePresence>
        {scenarioState.isTransitioning && (
          <motion.div 
            className="flex items-center space-x-2 bg-yellow-600/20 rounded-lg px-2 py-1"
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-yellow-400 hidden lg:inline">切換中...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}