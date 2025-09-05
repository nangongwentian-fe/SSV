import React, { useState, useCallback, useEffect } from 'react';
import { Play, Square, RefreshCw, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { globalMemoryManagementTest, MemoryTestReport, MemoryTestResult } from '../utils/MemoryManagementTest';

interface MemoryManagementTestPanelProps {
  onClose: () => void;
}

const MemoryManagementTestPanel: React.FC<MemoryManagementTestPanelProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testReport, setTestReport] = useState<MemoryTestReport | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);

  // 运行内存管理测试
  const runTests = useCallback(async () => {
    setIsRunning(true);
    setTestReport(null);
    setCurrentTest('正在初始化测试...');
    setProgress(0);

    try {
      // 模拟测试进度
      const testSteps = [
        '定时器清理测试',
        '组件清理测试', 
        '内存泄漏检测测试',
        'Store清理测试',
        '性能优化器清理测试',
        '资源管理器清理测试',
        '大数据处理测试',
        '长时间运行稳定性测试'
      ];

      for (let i = 0; i < testSteps.length; i++) {
        setCurrentTest(testSteps[i]);
        setProgress((i / testSteps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 运行实际测试
      const report = await globalMemoryManagementTest.runAllTests();
      setTestReport(report);
      setProgress(100);
      setCurrentTest('测试完成');
    } catch (error) {
      console.error('内存管理测试失败:', error);
      setCurrentTest(`测试失败: ${error}`);
    } finally {
      setIsRunning(false);
    }
  }, []);

  // 清理测试结果
  const clearResults = useCallback(() => {
    globalMemoryManagementTest.clearTestResults();
    setTestReport(null);
    setCurrentTest('');
    setProgress(0);
  }, []);

  // 格式化字节数
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const sign = bytes < 0 ? '-' : '+';
    return sign + parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取测试结果图标
  const getTestResultIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  // 获取内存变化颜色
  const getMemoryChangeColor = (memoryDiff: number) => {
    if (memoryDiff > 10 * 1024 * 1024) return 'text-red-500'; // >10MB
    if (memoryDiff > 5 * 1024 * 1024) return 'text-yellow-500'; // >5MB
    return 'text-green-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl h-[90%] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-800">内存管理测试</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* 控制区域 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={runTests}
                disabled={isRunning}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isRunning ? '测试中...' : '开始测试'}</span>
              </button>
              
              <button
                onClick={clearResults}
                disabled={isRunning}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="w-4 h-4" />
                <span>清理结果</span>
              </button>
            </div>

            {/* 测试进度 */}
            {isRunning && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">{currentTest}</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* 测试结果 */}
        <div className="flex-1 overflow-auto p-6">
          {testReport ? (
            <div className="space-y-6">
              {/* 测试概览 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  {testReport.overallPassed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span>测试概览</span>
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{testReport.totalTests}</div>
                    <div className="text-sm text-gray-600">总测试数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{testReport.passedTests}</div>
                    <div className="text-sm text-gray-600">通过测试</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{testReport.failedTests}</div>
                    <div className="text-sm text-gray-600">失败测试</div>
                  </div>
                </div>
                
                <p className="text-gray-700">{testReport.summary}</p>
              </div>

              {/* 详细测试结果 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">详细测试结果</h3>
                <div className="space-y-3">
                  {testReport.results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getTestResultIcon(result.passed)}
                          <span className="font-medium">{result.testName}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {result.duration}ms
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{result.details}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600">
                            内存前: {formatBytes(result.memoryBefore)}
                          </span>
                          <span className="text-gray-600">
                            内存后: {formatBytes(result.memoryAfter)}
                          </span>
                        </div>
                        <span className={`font-medium ${getMemoryChangeColor(result.memoryDiff)}`}>
                          变化: {formatBytes(result.memoryDiff)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 优化建议 */}
              {testReport.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">优化建议</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {testReport.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-gray-700">
                          {recommendation.startsWith('-') ? (
                            <span className="ml-4">{recommendation}</span>
                          ) : (
                            <span>{recommendation}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">点击"开始测试"运行内存管理测试</p>
                <p className="text-sm mt-2">测试将验证内存泄漏检测、资源清理等功能</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryManagementTestPanel;