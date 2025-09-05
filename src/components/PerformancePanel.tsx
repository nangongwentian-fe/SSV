import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Cpu, MemoryStick, Activity, X, Minimize2, Maximize2, Zap, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { globalPerformanceOptimizer } from '../utils/PerformanceOptimizer';
import { getPerformanceMonitor } from '../services/PerformanceMonitor';
import { useAutoCleanupTimer } from '../hooks/useCleanup';

interface PerformanceStats {
  fps: number;
  memoryUsage: number;
  animationCount: number;
  renderQueueSize: number;
  frameDropRate: string;
  cpuUsage?: number;
  memoryUsageMB: number;
  targetFPS: number;
  isRunning: boolean;
  memoryLeakDetected?: boolean;
  optimizationCount?: number;
  visibleFeatures: number;
  culledFeatures: number;
  renderTime: number;
  currentLOD: string;
}

interface PerformancePanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function PerformancePanel({ isVisible, onToggle }: PerformancePanelProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    memoryUsage: 0,
    animationCount: 0,
    renderQueueSize: 0,
    frameDropRate: '0%',
    memoryUsageMB: 0,
    targetFPS: 60,
    isRunning: true,
    memoryLeakDetected: false,
    optimizationCount: 0,
    visibleFeatures: 0,
    culledFeatures: 0,
    renderTime: 0,
    currentLOD: '1'
  });
  const [isMinimized, setIsMinimized] = useState(false);

  // 更新性能统计的函数
  const updateStats = () => {
    if (!isVisible) return;
    
    // 获取性能优化器数据
    const optimizerMetrics = globalPerformanceOptimizer.getPerformanceMetrics() || {
      fps: 60,
      memoryUsage: 0,
      renderTime: 0,
      visibleFeatures: 0
    };
    
    // 获取LayerManager的渲染优化统计
    const layerManager = (window as any).layerManager;
    const renderOptStats = layerManager?.getRenderOptimizationStats?.() || {
      visibleFeatures: 0,
      culledFeatures: 0,
      renderTime: 0,
      currentLOD: 1
    };

    setStats({
      fps: optimizerMetrics.fps,
      memoryUsage: optimizerMetrics.memoryUsage,
      animationCount: 0,
      renderQueueSize: 0,
      frameDropRate: '0%',
      memoryUsageMB: optimizerMetrics.memoryUsage,
      targetFPS: 60,
      isRunning: true,
      memoryLeakDetected: false, // 内存泄漏检测将在下面单独处理
      optimizationCount: 0, // 优化计数暂时设为0
      visibleFeatures: renderOptStats.visibleFeatures,
      culledFeatures: renderOptStats.culledFeatures,
      renderTime: Math.max(optimizerMetrics.renderTime, renderOptStats.renderTime),
      currentLOD: renderOptStats.currentLOD.toString()
    });
  };

  // 使用自动清理定时器
  useAutoCleanupTimer('PerformancePanel', updateStats, 1000, true);
  
  // 初始化时更新一次
  useEffect(() => {
    if (isVisible) {
      updateStats();
    }
  }, [isVisible]);

  const updatePerformanceStats = () => {
    try {
      const performanceMonitor = getPerformanceMonitor();
      const animationEngine = (window as any).animationEngine;
      const dataSimulator = (window as any).dataSimulator;
      const performanceOptimizer = (window as any).performanceOptimizer;
      const layerManager = (window as any).mapboxMapRef?.layerManager;
      
      // 获取FPS - 使用性能监控器的统计数据
      const performanceStats = performanceMonitor.getStats();
      const fps = performanceStats.current.fps || 60;
      
      // 获取内存使用情况
      let memoryUsage = 0;
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      
      // 获取动画引擎统计
      let animationStats = {
        animationCount: 0,
        renderQueueSize: 0,
        frameDropRate: '0%'
      };
      
      if (animationEngine && animationEngine.getPerformanceStats) {
        const engineStats = animationEngine.getPerformanceStats();
        animationStats = {
          animationCount: engineStats.activeAnimations || 0,
          renderQueueSize: engineStats.renderQueueSize || 0,
          frameDropRate: engineStats.frameDropRate || '0%'
        };
      }
      
      // 检查内存泄漏
      let memoryLeakDetected = false;
      if ((performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        const memoryUsagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
        memoryLeakDetected = memoryUsagePercent > 85;
      }
      
      // 获取图层管理器统计
      let layerStats = {
        visibleFeatures: 0,
        culledFeatures: 0,
        renderTime: 0,
        currentLOD: 'medium'
      };
      
      if (layerManager && layerManager.getPerformanceStats && layerManager.getRenderOptimizationStats) {
        const layerPerf = layerManager.getPerformanceStats();
        const renderStats = layerManager.getRenderOptimizationStats();
        layerStats = {
          visibleFeatures: layerPerf.visibleFeatures || 0,
          culledFeatures: layerPerf.culledFeatures || 0,
          renderTime: layerPerf.renderTime || 0,
          currentLOD: renderStats.currentLOD || 'medium'
        };
      }
      
      setStats({
        fps: Math.round(fps),
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        memoryUsageMB: Math.round(memoryUsage * 100) / 100,
        targetFPS: 60,
        isRunning: true,
        memoryLeakDetected,
        optimizationCount: 0,
        ...animationStats,
        ...layerStats
      });
    } catch (error) {
      console.warn('Failed to update performance stats:', error);
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }, reverse = false) => {
    if (reverse) {
      if (value <= thresholds.good) return 'text-green-400';
      if (value <= thresholds.warning) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value >= thresholds.good) return 'text-green-400';
      if (value >= thresholds.warning) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const handleCleanup = () => {
    // 使用性能优化器进行内存清理
    globalPerformanceOptimizer.forceMemoryCleanup();
    
    // 清理LayerManager内存统计
    const layerManager = (window as any).layerManager;
    if (layerManager?.cleanupMemoryStats) {
      layerManager.cleanupMemoryStats();
    }
    
    console.log('内存清理完成');
  };

  const getMemoryStatusColor = (memoryMB: number) => {
    if (memoryMB < 50) return 'text-green-400';
    if (memoryMB < 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="fixed top-4 right-4 z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl"
        style={{ minWidth: isMinimized ? '200px' : '280px' }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">性能监控</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title={isMinimized ? '展开' : '最小化'}
            >
              {isMinimized ? (
                <Maximize2 className="w-3 h-3 text-gray-400" />
              ) : (
                <Minimize2 className="w-3 h-3 text-gray-400" />
              )}
            </button>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="关闭"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>

        {/* 性能指标 */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-3 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">FPS</span>
                    {stats.isRunning && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className={`text-2xl font-bold ${getStatusColor(stats.fps, { good: 50, warning: 30 })}`}>
                    {stats.fps}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    目标: {stats.targetFPS}fps
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MemoryStick className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">内存</span>
                    {stats.memoryLeakDetected && (
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <div className={`text-2xl font-bold ${getStatusColor(stats.memoryUsageMB, { good: 50, warning: 100 }, true)}`}>
                    {stats.memoryUsageMB.toFixed(1)}MB
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    JS堆内存
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium">动画</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">
                    {stats.animationCount}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    活跃动画数
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium">渲染</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">
                    {stats.renderQueueSize}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    渲染队列
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">可见要素</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {stats.visibleFeatures}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    已裁剪: {stats.culledFeatures}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium">渲染时间</span>
                  </div>
                  <div className={`text-2xl font-bold ${getStatusColor(stats.renderTime, { good: 3, warning: 5 }, true)}`}>
                    {stats.renderTime.toFixed(1)}ms
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    LOD: {stats.currentLOD}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">掉帧率:</span>
                  <span className={getStatusColor(100 - parseFloat(stats.frameDropRate), { good: 95, warning: 90 })}>
                    {stats.frameDropRate}
                  </span>
                </div>
                {stats.cpuUsage !== undefined && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">CPU使用率:</span>
                    <span className={getStatusColor(100 - stats.cpuUsage, { good: 70, warning: 50 })}>
                      {stats.cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                )}
                {stats.optimizationCount !== undefined && stats.optimizationCount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">优化次数:</span>
                    <span className="text-yellow-400">
                      {stats.optimizationCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCleanup}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  清理内存
                </button>
                {stats.memoryLeakDetected && (
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    内存泄漏
                  </div>
                )}
                {!stats.memoryLeakDetected && stats.memoryUsageMB < 50 && (
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    性能良好
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}