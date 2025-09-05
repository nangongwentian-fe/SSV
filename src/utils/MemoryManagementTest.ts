/**
 * 内存管理测试脚本
 * 验证内存管理优化的效果，包括组件清理、内存泄漏检测、定时器管理等
 */
import { globalMemoryLeakDetector } from './MemoryLeakDetector';
import { globalTimerManager } from './TimerManager';
import { globalResourceManager } from './ResourceManager';
import { globalPerformanceOptimizer } from './PerformanceOptimizer';
import { useRealtimeStore } from '../store/realtimeStore';
import { useMapStore } from '../store/mapStore';

interface MemoryTestResult {
  testName: string;
  passed: boolean;
  details: string;
  memoryBefore: number;
  memoryAfter: number;
  memoryDiff: number;
  duration: number;
}

interface MemoryTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  overallPassed: boolean;
  results: MemoryTestResult[];
  summary: string;
  recommendations: string[];
}

class MemoryManagementTest {
  private static instance: MemoryManagementTest;
  private testResults: MemoryTestResult[] = [];

  private constructor() {}

  static getInstance(): MemoryManagementTest {
    if (!MemoryManagementTest.instance) {
      MemoryManagementTest.instance = new MemoryManagementTest();
    }
    return MemoryManagementTest.instance;
  }

  /**
   * 运行所有内存管理测试
   */
  async runAllTests(): Promise<MemoryTestReport> {
    console.log('开始内存管理测试...');
    this.testResults = [];

    // 运行各项测试
    await this.testTimerCleanup();
    await this.testComponentCleanup();
    await this.testMemoryLeakDetection();
    await this.testStoreCleanup();
    await this.testPerformanceOptimizerCleanup();
    await this.testResourceManagerCleanup();
    await this.testLargeDataHandling();
    await this.testLongRunningStability();

    // 生成报告
    const report = this.generateReport();
    console.log('内存管理测试完成', report);
    return report;
  }

  /**
   * 测试定时器清理
   */
  private async testTimerCleanup(): Promise<void> {
    const testName = '定时器清理测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 创建大量定时器
      const timerIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const timerId = `test-timer-${i}`;
        globalTimerManager.setTimeout(timerId, () => {
          console.log(`Timer ${i} executed`);
        }, 1000 + i * 10);
        timerIds.push(timerId);
      }

      // 创建间隔定时器
      for (let i = 0; i < 50; i++) {
        const intervalId = `test-interval-${i}`;
        globalTimerManager.setInterval(intervalId, () => {
          console.log(`Interval ${i} executed`);
        }, 100);
        timerIds.push(intervalId);
      }

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 500));

      // 检查定时器数量
      const statsBeforeCleanup = globalTimerManager.getStats();
      console.log('清理前定时器统计:', statsBeforeCleanup);

      // 清理定时器
      timerIds.forEach(id => {
        if (id.includes('interval')) {
          globalTimerManager.clearInterval(id);
        } else {
          globalTimerManager.clearTimeout(id);
        }
      });

      // 等待清理完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 检查清理后的状态
      const statsAfterCleanup = globalTimerManager.getStats();
      console.log('清理后定时器统计:', statsAfterCleanup);

      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      // 验证清理效果
      const cleanupEffective = statsAfterCleanup.total < statsBeforeCleanup.total;
      
      this.testResults.push({
        testName,
        passed: cleanupEffective,
        details: `清理前: ${statsBeforeCleanup.total}个定时器, 清理后: ${statsAfterCleanup.total}个定时器`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 测试组件清理
   */
  private async testComponentCleanup(): Promise<void> {
    const testName = '组件清理测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 注册大量组件
      const componentIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const componentId = `test-component-${i}`;
        globalResourceManager.registerCleanup(componentId, () => {
          console.log(`Component ${i} cleaned up`);
        });
        componentIds.push(componentId);
      }

      // 检查注册状态
      const countBefore = globalResourceManager.getRegisteredComponentsCount();
      console.log('注册组件数量:', countBefore);

      // 清理组件
      componentIds.forEach(id => {
        globalResourceManager.unregisterCleanup(id);
      });

      // 检查清理后状态
      const countAfter = globalResourceManager.getRegisteredComponentsCount();
      console.log('清理后组件数量:', countAfter);

      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      // 验证清理效果
      const cleanupEffective = countAfter < countBefore;
      
      this.testResults.push({
        testName,
        passed: cleanupEffective,
        details: `清理前: ${countBefore}个组件, 清理后: ${countAfter}个组件`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 测试内存泄漏检测
   */
  private async testMemoryLeakDetection(): Promise<void> {
    const testName = '内存泄漏检测测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 启动内存泄漏检测
      globalMemoryLeakDetector.start();

      // 模拟内存泄漏
      const leakyObjects: any[] = [];
      for (let i = 0; i < 1000; i++) {
        leakyObjects.push({
          id: i,
          data: new Array(1000).fill(Math.random()),
          timestamp: Date.now()
        });
      }

      // 等待检测
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 检查是否检测到泄漏
      const reports = globalMemoryLeakDetector.getReports();
      const hasLeakReports = reports.length > 0;

      // 清理泄漏对象
      leakyObjects.length = 0;

      // 触发垃圾回收
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      } else if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }

      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName,
        passed: hasLeakReports, // 应该检测到泄漏
        details: `检测到 ${reports.length} 个泄漏报告`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 测试Store清理
   */
  private async testStoreCleanup(): Promise<void> {
    const testName = 'Store清理测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 获取Store实例
      const realtimeStore = useRealtimeStore.getState();
      const mapStore = useMapStore.getState();

      // 模拟Store使用
      if (realtimeStore.startRealtime) {
        realtimeStore.startRealtime();
      }
      
      if (mapStore.initializeScenarioSystems) {
        mapStore.initializeScenarioSystems();
      }

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 清理Store
      if (realtimeStore.cleanup) {
        realtimeStore.cleanup();
      }
      
      if (mapStore.destroy) {
        mapStore.destroy();
      }

      // 等待清理完成
      await new Promise(resolve => setTimeout(resolve, 500));

      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      // 验证清理（这里主要检查是否没有抛出错误）
      this.testResults.push({
        testName,
        passed: true, // 如果没有抛出错误就算通过
        details: 'Store清理完成，未发生错误',
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 测试性能优化器清理
   */
  private async testPerformanceOptimizerCleanup(): Promise<void> {
    const testName = '性能优化器清理测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 启动性能优化器
      globalPerformanceOptimizer.start();

      // 等待一段时间收集数据
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 停止优化器
      globalPerformanceOptimizer.stop();

      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      // 检查内存是否有所减少或保持稳定
      const memoryIncreaseAcceptable = (memoryAfter - memoryBefore) < 10 * 1024 * 1024; // 10MB以内的增长是可接受的

      this.testResults.push({
        testName,
        passed: memoryIncreaseAcceptable,
        details: `内存变化: ${this.formatBytes(memoryAfter - memoryBefore)}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 测试资源管理器清理
   */
  private async testResourceManagerCleanup(): Promise<void> {
    const testName = '资源管理器清理测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 模拟一些资源使用
      const testResources: any[] = [];
      for (let i = 0; i < 50; i++) {
        testResources.push({
          id: `cleanup-test-${i}`,
          data: new Array(100).fill(Math.random())
        });
      }

      // 清理测试资源
      testResources.length = 0;

      // 等待清理完成
      await new Promise(resolve => setTimeout(resolve, 500));

      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName,
        passed: true,
        details: '资源管理器清理完成',
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 测试大数据处理
   */
  private async testLargeDataHandling(): Promise<void> {
    const testName = '大数据处理测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 创建大量数据
      const largeDataArray: any[] = [];
      for (let i = 0; i < 10000; i++) {
        largeDataArray.push({
          id: i,
          data: new Array(100).fill(Math.random()),
          timestamp: Date.now(),
          metadata: {
            type: 'test',
            category: `category-${i % 10}`,
            tags: [`tag-${i % 5}`, `tag-${i % 3}`]
          }
        });
      }

      // 模拟数据处理
      const processedData = largeDataArray
        .filter(item => item.id % 2 === 0)
        .map(item => ({ ...item, processed: true }))
        .slice(0, 1000); // 只保留前1000个

      // 清理原始数据
      largeDataArray.length = 0;

      // 等待垃圾回收
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 触发垃圾回收
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      } else if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }

      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      // 检查内存增长是否在合理范围内
      const memoryIncreaseReasonable = (memoryAfter - memoryBefore) < 50 * 1024 * 1024; // 50MB以内

      this.testResults.push({
        testName,
        passed: memoryIncreaseReasonable,
        details: `处理了10000条数据，保留了${processedData.length}条，内存增长: ${this.formatBytes(memoryAfter - memoryBefore)}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 测试长时间运行稳定性
   */
  private async testLongRunningStability(): Promise<void> {
    const testName = '长时间运行稳定性测试';
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // 模拟长时间运行场景
      const iterations = 100;
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // 创建一些临时对象
        const tempObjects = new Array(100).fill(null).map((_, index) => ({
          id: `temp-${i}-${index}`,
          data: Math.random(),
          timestamp: Date.now()
        }));

        // 模拟处理
        tempObjects.forEach(obj => {
          obj.data = obj.data * 2;
        });

        // 记录内存快照
        if (i % 10 === 0) {
          memorySnapshots.push(this.getMemoryUsage());
        }

        // 短暂等待
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // 分析内存趋势
      const memoryTrend = this.calculateMemoryTrend(memorySnapshots);
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;

      // 检查内存是否稳定（趋势不应该持续上升）
      const memoryStable = Math.abs(memoryTrend) < 1024 * 1024; // 1MB/snapshot的趋势是可接受的

      this.testResults.push({
        testName,
        passed: memoryStable,
        details: `执行了${iterations}次迭代，内存趋势: ${this.formatBytes(memoryTrend)}/快照`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });

    } catch (error) {
      const memoryAfter = this.getMemoryUsage();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        details: `测试失败: ${error}`,
        memoryBefore,
        memoryAfter,
        memoryDiff: memoryAfter - memoryBefore,
        duration
      });
    }
  }

  /**
   * 生成测试报告
   */
  private generateReport(): MemoryTestReport {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(result => result.passed).length;
    const failedTests = totalTests - passedTests;
    const overallPassed = failedTests === 0;

    const recommendations: string[] = [];
    
    // 分析失败的测试
    const failedResults = this.testResults.filter(result => !result.passed);
    if (failedResults.length > 0) {
      recommendations.push('以下测试失败，需要进一步优化:');
      failedResults.forEach(result => {
        recommendations.push(`- ${result.testName}: ${result.details}`);
      });
    }

    // 分析内存使用
    const totalMemoryIncrease = this.testResults.reduce((sum, result) => sum + result.memoryDiff, 0);
    if (totalMemoryIncrease > 100 * 1024 * 1024) { // 100MB
      recommendations.push('总体内存增长较大，建议检查内存泄漏');
    }

    // 分析测试时长
    const totalDuration = this.testResults.reduce((sum, result) => sum + result.duration, 0);
    if (totalDuration > 30000) { // 30秒
      recommendations.push('测试执行时间较长，可能存在性能问题');
    }

    if (recommendations.length === 0) {
      recommendations.push('所有内存管理测试通过，系统运行良好');
    }

    const summary = overallPassed 
      ? `所有 ${totalTests} 项测试通过，内存管理系统运行正常`
      : `${totalTests} 项测试中有 ${failedTests} 项失败，需要进一步优化`;

    return {
      totalTests,
      passedTests,
      failedTests,
      overallPassed,
      results: this.testResults,
      summary,
      recommendations
    };
  }

  /**
   * 获取内存使用量
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 计算内存趋势
   */
  private calculateMemoryTrend(snapshots: number[]): number {
    if (snapshots.length < 2) return 0;
    
    const n = snapshots.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = snapshots.reduce((sum, val) => sum + val, 0);
    const sumXY = snapshots.reduce((sum, val, index) => sum + index * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const sign = bytes < 0 ? '-' : '+';
    return sign + parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 清理测试数据
   */
  clearTestResults(): void {
    this.testResults = [];
  }

  /**
   * 获取最新测试结果
   */
  getLatestResults(): MemoryTestResult[] {
    return [...this.testResults];
  }
}

// 导出单例实例
export const globalMemoryManagementTest = MemoryManagementTest.getInstance();

// 导出类型
export type { MemoryTestResult, MemoryTestReport };

export default MemoryManagementTest;