/**
 * 长时间运行测试控制面板
 * 提供可视化界面来启动、监控和查看长时间稳定性测试结果
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Clock, Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { globalLongRunningTest, type LongRunningTestReport, type LongRunningTestConfig } from '../utils/LongRunningTest';

interface LongRunningTestPanelProps {
  className?: string;
}

const LongRunningTestPanel: React.FC<LongRunningTestPanelProps> = ({ className = '' }) => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testStatus, setTestStatus] = useState({
    isRunning: false,
    testDuration: 0,
    executedScenarios: 0,
    totalScenarios: 0
  });
  const [testReport, setTestReport] = useState<LongRunningTestReport | null>(null);
  const [testConfig, setTestConfig] = useState<Partial<LongRunningTestConfig>>({
    totalDuration: 2 * 60 * 60 * 1000, // 2小时
    memoryCheckInterval: 30 * 1000, // 30秒
    performanceCheckInterval: 10 * 1000, // 10秒
    autoCleanup: true
  });
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // 更新测试状态
  const updateTestStatus = useCallback(() => {
    const status = globalLongRunningTest.getStatus();
    setTestStatus(status);
    setIsTestRunning(status.isRunning);

    if (!status.isRunning && testReport === null) {
      const latestReport = globalLongRunningTest.getLatestReport();
      if (latestReport.testDuration > 0) {
        setTestReport(latestReport);
      }
    }
  }, [testReport]);

  // 定期更新状态
  useEffect(() => {
    const interval = setInterval(updateTestStatus, 1000);
    return () => clearInterval(interval);
  }, [updateTestStatus]);

  // 启动测试
  const handleStartTest = async () => {
    try {
      setTestReport(null);
      await globalLongRunningTest.startTest({
        ...testConfig,
        reportCallback: (report) => {
          setTestReport(report);
        }
      });
    } catch (error) {
      console.error('启动长时间运行测试失败:', error);
    }
  };

  // 停止测试
  const handleStopTest = () => {
    const report = globalLongRunningTest.stopTest();
    setTestReport(report);
  };

  // 格式化时间
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 格式化文件大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取稳定性评分颜色
  const getStabilityScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 获取稳定性评分图标
  const getStabilityScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <TrendingUp className="w-5 h-5 text-yellow-600" />;
    return <TrendingDown className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          长时间运行测试
        </h3>
        <div className="flex gap-2">
          {!isTestRunning ? (
            <button
              onClick={handleStartTest}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              开始测试
            </button>
          ) : (
            <button
              onClick={handleStopTest}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Square className="w-4 h-4" />
              停止测试
            </button>
          )}
        </div>
      </div>

      {/* 测试配置 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-700">测试配置</h4>
          <button
            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvancedConfig ? '隐藏高级配置' : '显示高级配置'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              测试时长（小时）
            </label>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={(testConfig.totalDuration || 0) / (1000 * 60 * 60)}
              onChange={(e) => setTestConfig({
                ...testConfig,
                totalDuration: parseFloat(e.target.value) * 1000 * 60 * 60
              })}
              disabled={isTestRunning}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              自动清理
            </label>
            <select
              value={testConfig.autoCleanup ? 'true' : 'false'}
              onChange={(e) => setTestConfig({
                ...testConfig,
                autoCleanup: e.target.value === 'true'
              })}
              disabled={isTestRunning}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </div>
        </div>

        {showAdvancedConfig && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                内存检查间隔（秒）
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={(testConfig.memoryCheckInterval || 0) / 1000}
                onChange={(e) => setTestConfig({
                  ...testConfig,
                  memoryCheckInterval: parseInt(e.target.value) * 1000
                })}
                disabled={isTestRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                性能检查间隔（秒）
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={(testConfig.performanceCheckInterval || 0) / 1000}
                onChange={(e) => setTestConfig({
                  ...testConfig,
                  performanceCheckInterval: parseInt(e.target.value) * 1000
                })}
                disabled={isTestRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>
        )}
      </div>

      {/* 测试状态 */}
      {isTestRunning && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-md font-medium text-blue-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            测试进行中
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">运行时间:</span>
              <div className="text-blue-800 font-mono">
                {formatDuration(testStatus.testDuration)}
              </div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">已执行场景:</span>
              <div className="text-blue-800">
                {testStatus.executedScenarios} / {testStatus.totalScenarios}
              </div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">进度:</span>
              <div className="text-blue-800">
                {testStatus.totalScenarios > 0 
                  ? Math.round((testStatus.executedScenarios / testStatus.totalScenarios) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 测试报告 */}
      {testReport && (
        <div className="space-y-6">
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-700 mb-4">测试报告</h4>
            
            {/* 总体状态 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">测试时长</div>
                <div className="text-lg font-semibold text-gray-800">
                  {formatDuration(testReport.testDuration)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">执行场景</div>
                <div className="text-lg font-semibold text-gray-800">
                  {testReport.scenariosExecuted}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  稳定性评分
                  {getStabilityScoreIcon(testReport.stabilityScore)}
                </div>
                <div className={`text-lg font-semibold ${getStabilityScoreColor(testReport.stabilityScore)}`}>
                  {testReport.stabilityScore.toFixed(1)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">问题数量</div>
                <div className="text-lg font-semibold text-gray-800">
                  {testReport.issues.length}
                </div>
              </div>
            </div>

            {/* 问题检测 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`p-3 rounded-lg ${
                testReport.memoryLeaks ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {testReport.memoryLeaks ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    testReport.memoryLeaks ? 'text-red-800' : 'text-green-800'
                  }`}>
                    内存泄漏
                  </span>
                </div>
                <div className={`text-xs ${
                  testReport.memoryLeaks ? 'text-red-600' : 'text-green-600'
                }`}>
                  {testReport.memoryLeaks ? '检测到泄漏' : '未检测到泄漏'}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${
                testReport.performanceDegradation ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {testReport.performanceDegradation ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    testReport.performanceDegradation ? 'text-red-800' : 'text-green-800'
                  }`}>
                    性能衰减
                  </span>
                </div>
                <div className={`text-xs ${
                  testReport.performanceDegradation ? 'text-red-600' : 'text-green-600'
                }`}>
                  {testReport.performanceDegradation ? '检测到衰减' : '性能稳定'}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${
                testReport.resourceLeaks ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {testReport.resourceLeaks ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    testReport.resourceLeaks ? 'text-red-800' : 'text-green-800'
                  }`}>
                    资源泄漏
                  </span>
                </div>
                <div className={`text-xs ${
                  testReport.resourceLeaks ? 'text-red-600' : 'text-green-600'
                }`}>
                  {testReport.resourceLeaks ? '检测到泄漏' : '资源管理正常'}
                </div>
              </div>
            </div>

            {/* 优化建议 */}
            {testReport.recommendations.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-2">优化建议</h5>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {testReport.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 问题列表 */}
            {testReport.issues.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-2">发现的问题</h5>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <ul className="text-sm text-red-800 space-y-1">
                    {testReport.issues.map((issue, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-600 mt-1 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 详细指标 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h6 className="text-sm font-medium text-gray-700 mb-2">内存使用</h6>
                <div className="text-xs text-gray-600">
                  {testReport.detailedMetrics.memoryUsage.length > 0 ? (
                    <div>
                      <div>采样点: {testReport.detailedMetrics.memoryUsage.length}</div>
                      <div>最大使用: {formatBytes(Math.max(...testReport.detailedMetrics.memoryUsage.map(m => m.usage)))}</div>
                      <div>最小使用: {formatBytes(Math.min(...testReport.detailedMetrics.memoryUsage.map(m => m.usage)))}</div>
                    </div>
                  ) : (
                    <div>暂无数据</div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <h6 className="text-sm font-medium text-gray-700 mb-2">性能指标</h6>
                <div className="text-xs text-gray-600">
                  {testReport.detailedMetrics.performanceMetrics.length > 0 ? (
                    <div>
                      <div>采样点: {testReport.detailedMetrics.performanceMetrics.length}</div>
                      <div>平均FPS: {(testReport.detailedMetrics.performanceMetrics.reduce((sum, m) => sum + m.fps, 0) / testReport.detailedMetrics.performanceMetrics.length).toFixed(1)}</div>
                      <div>平均渲染时间: {(testReport.detailedMetrics.performanceMetrics.reduce((sum, m) => sum + m.renderTime, 0) / testReport.detailedMetrics.performanceMetrics.length).toFixed(1)}ms</div>
                    </div>
                  ) : (
                    <div>暂无数据</div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <h6 className="text-sm font-medium text-gray-700 mb-2">资源使用</h6>
                <div className="text-xs text-gray-600">
                  {testReport.detailedMetrics.resourceUsage.length > 0 ? (
                    <div>
                      <div>采样点: {testReport.detailedMetrics.resourceUsage.length}</div>
                      <div>最大定时器: {Math.max(...testReport.detailedMetrics.resourceUsage.map(r => r.timers))}</div>
                      <div>最大组件: {Math.max(...testReport.detailedMetrics.resourceUsage.map(r => r.components))}</div>
                    </div>
                  ) : (
                    <div>暂无数据</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LongRunningTestPanel;