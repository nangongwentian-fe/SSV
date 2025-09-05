/**
 * 稳定性测试面板组件
 * 提供可视化界面来启动、监控和查看稳定性测试结果
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, BarChart3, AlertTriangle, CheckCircle, Clock, MemoryStick, Cpu, Activity } from 'lucide-react';
import { globalStabilityTester, type StabilityReport, type StabilityMetrics } from '../utils/StabilityTester';

interface StabilityTestPanelProps {
  className?: string;
}

const StabilityTestPanel: React.FC<StabilityTestPanelProps> = ({ className = '' }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testDuration, setTestDuration] = useState(0);
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [currentMetrics, setCurrentMetrics] = useState<StabilityMetrics | null>(null);
  const [lastReport, setLastReport] = useState<StabilityReport | null>(null);
  const [testConfig, setTestConfig] = useState({
    duration: 30, // 分钟
    sampleInterval: 10, // 秒
    memoryThreshold: 50, // MB/hour
    performanceThreshold: 10, // %
    autoCleanup: true
  });

  // 更新状态的定时器
  useEffect(() => {
    const updateStatus = () => {
      const status = globalStabilityTester.getStatus();
      setIsRunning(status.isRunning);
      setTestDuration(status.testDuration);
      setSamplesCollected(status.samplesCollected);
      
      const metrics = globalStabilityTester.getCurrentMetrics();
      setCurrentMetrics(metrics);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 开始测试
  const handleStartTest = useCallback(() => {
    const config = {
      duration: testConfig.duration * 60 * 1000, // 转换为毫秒
      sampleInterval: testConfig.sampleInterval * 1000, // 转换为毫秒
      memoryThreshold: testConfig.memoryThreshold,
      performanceThreshold: testConfig.performanceThreshold,
      autoCleanup: testConfig.autoCleanup,
      reportCallback: (report: StabilityReport) => {
        setLastReport(report);
      }
    };

    globalStabilityTester.startTest(config);
  }, [testConfig]);

  // 停止测试
  const handleStopTest = useCallback(() => {
    const report = globalStabilityTester.stopTest();
    setLastReport(report);
  }, []);

  // 清理测试数据
  const handleClearData = useCallback(() => {
    globalStabilityTester.clearTestData();
    setLastReport(null);
  }, []);

  // 格式化时间
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 格式化内存大小
  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // 获取稳定性评分颜色
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  // 获取状态图标
  const getStatusIcon = (hasIssue: boolean) => {
    return hasIssue ? (
      <AlertTriangle className="w-4 h-4 text-red-500" />
    ) : (
      <CheckCircle className="w-4 h-4 text-green-500" />
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          稳定性测试
        </h3>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handleStopTest}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Square className="w-4 h-4" />
              停止测试
            </button>
          ) : (
            <button
              onClick={handleStartTest}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              开始测试
            </button>
          )}
          <button
            onClick={handleClearData}
            className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            清理数据
          </button>
        </div>
      </div>

      {/* 测试配置 */}
      {!isRunning && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">测试配置</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">测试时长 (分钟)</label>
              <input
                type="number"
                value={testConfig.duration}
                onChange={(e) => setTestConfig(prev => ({ ...prev, duration: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="120"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">采样间隔 (秒)</label>
              <input
                type="number"
                value={testConfig.sampleInterval}
                onChange={(e) => setTestConfig(prev => ({ ...prev, sampleInterval: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="60"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">内存阈值 (MB/h)</label>
              <input
                type="number"
                value={testConfig.memoryThreshold}
                onChange={(e) => setTestConfig(prev => ({ ...prev, memoryThreshold: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="10"
                max="500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">性能阈值 (%)</label>
              <input
                type="number"
                value={testConfig.performanceThreshold}
                onChange={(e) => setTestConfig(prev => ({ ...prev, performanceThreshold: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="50"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={testConfig.autoCleanup}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, autoCleanup: e.target.checked }))}
                  className="rounded"
                />
                自动清理
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 测试状态 */}
      {isRunning && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-sm font-medium text-blue-700">测试进行中...</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">运行时间</div>
              <div className="font-medium text-blue-700">{formatDuration(testDuration)}</div>
            </div>
            <div>
              <div className="text-gray-600">采样数量</div>
              <div className="font-medium text-blue-700">{samplesCollected}</div>
            </div>
            <div>
              <div className="text-gray-600">预计剩余</div>
              <div className="font-medium text-blue-700">
                {formatDuration(Math.max(0, testConfig.duration * 60 * 1000 - testDuration))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 实时指标 */}
      {currentMetrics && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">实时指标</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MemoryStick className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-600">内存使用</span>
              </div>
              <div className="text-sm font-medium">
                {formatMemory(currentMetrics.memoryUsage.usedJSHeapSize)}
              </div>
              <div className="text-xs text-gray-500">
                增长率: {currentMetrics.stability.memoryGrowthRate.toFixed(1)} MB/h
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-600">性能</span>
              </div>
              <div className="text-sm font-medium">
                {currentMetrics.performance.fps.toFixed(0)} FPS
              </div>
              <div className="text-xs text-gray-500">
                衰减: {currentMetrics.stability.performanceDegradation.toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-gray-600">活跃定时器</span>
              </div>
              <div className="text-sm font-medium">
                {currentMetrics.resources.activeTimers}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-600">活跃组件</span>
              </div>
              <div className="text-sm font-medium">
                {currentMetrics.resources.activeComponents}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 测试报告 */}
      {lastReport && (
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4">最新测试报告</h4>
          
          {/* 总体评分 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">稳定性评分</span>
              <span className={`text-2xl font-bold ${getScoreColor(lastReport.summary.stabilityScore)}`}>
                {lastReport.summary.stabilityScore}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  lastReport.summary.stabilityScore >= 80 ? 'bg-green-500' :
                  lastReport.summary.stabilityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${lastReport.summary.stabilityScore}%` }}
              />
            </div>
          </div>

          {/* 问题检测 */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">问题检测</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(lastReport.memoryLeakDetected)}
                <span>内存泄漏</span>
                {lastReport.memoryLeakDetected && (
                  <span className="text-red-600">
                    ({lastReport.summary.avgMemoryGrowth.toFixed(1)} MB/h)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(lastReport.performanceDegradation)}
                <span>性能衰减</span>
                {lastReport.performanceDegradation && (
                  <span className="text-red-600">
                    ({lastReport.summary.avgPerformanceLoss.toFixed(1)}%)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(lastReport.resourceLeaks)}
                <span>资源泄漏</span>
                {lastReport.resourceLeaks && (
                  <span className="text-red-600">
                    (评分: {lastReport.summary.maxResourceUsage.toFixed(0)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 建议 */}
          {lastReport.recommendations.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">优化建议</h5>
              <ul className="space-y-1">
                {lastReport.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 测试统计 */}
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            <div className="flex justify-between">
              <span>测试时长: {formatDuration(lastReport.testDuration)}</span>
              <span>采样数量: {lastReport.totalSamples}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StabilityTestPanel;