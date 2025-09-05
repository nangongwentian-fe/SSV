/**
 * 长时间运行测试脚本
 * 自动化测试应用的稳定性、内存泄漏和性能衰减
 */
import { globalStabilityTester } from './StabilityTester';
import { globalMemoryLeakDetector } from './MemoryLeakDetector';
import { globalPerformanceOptimizer } from './PerformanceOptimizer';
import { globalTimerManager } from './TimerManager';
import { globalResourceManager } from './ResourceManager';
import { useRealtimeStore } from '../store/realtimeStore';
import { useMapStore } from '../store/mapStore';

interface TestScenario {
  name: string;
  description: string;
  duration: number; // 毫秒
  actions: Array<{
    delay: number; // 延迟执行时间（毫秒）
    action: () => Promise<void> | void;
    description: string;
  }>;
}

interface LongRunningTestConfig {
  scenarios: TestScenario[];
  totalDuration: number; // 总测试时长（毫秒）
  memoryCheckInterval: number; // 内存检查间隔（毫秒）
  performanceCheckInterval: number; // 性能检查间隔（毫秒）
  autoCleanup: boolean;
  reportCallback?: (report: LongRunningTestReport) => void;
}

interface LongRunningTestReport {
  testDuration: number;
  scenariosExecuted: number;
  memoryLeaks: boolean;
  performanceDegradation: boolean;
  resourceLeaks: boolean;
  stabilityScore: number;
  issues: string[];
  recommendations: string[];
  detailedMetrics: {
    memoryUsage: Array<{ timestamp: number; usage: number }>;
    performanceMetrics: Array<{ timestamp: number; fps: number; renderTime: number }>;
    resourceUsage: Array<{ timestamp: number; timers: number; components: number }>;
  };
}

class LongRunningTest {
  private static instance: LongRunningTest;
  private config: LongRunningTestConfig;
  private isRunning = false;
  private startTime = 0;
  private executedScenarios = 0;
  private testReport: LongRunningTestReport;
  private monitoringTimers: string[] = [];

  private constructor() {
    this.config = {
      scenarios: [],
      totalDuration: 2 * 60 * 60 * 1000, // 2小时
      memoryCheckInterval: 30 * 1000, // 30秒
      performanceCheckInterval: 10 * 1000, // 10秒
      autoCleanup: true
    };

    this.testReport = this.createEmptyReport();
  }

  static getInstance(): LongRunningTest {
    if (!LongRunningTest.instance) {
      LongRunningTest.instance = new LongRunningTest();
    }
    return LongRunningTest.instance;
  }

  /**
   * 开始长时间运行测试
   */
  async startTest(config?: Partial<LongRunningTestConfig>): Promise<void> {
    if (this.isRunning) {
      console.warn('长时间运行测试已在进行中');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 如果没有提供测试场景，使用默认场景
    if (this.config.scenarios.length === 0) {
      this.config.scenarios = this.getDefaultScenarios();
    }

    console.log('开始长时间运行测试...', {
      totalDuration: `${this.config.totalDuration / 1000 / 60}分钟`,
      scenarios: this.config.scenarios.length,
      memoryCheckInterval: `${this.config.memoryCheckInterval / 1000}秒`,
      performanceCheckInterval: `${this.config.performanceCheckInterval / 1000}秒`
    });

    this.isRunning = true;
    this.startTime = Date.now();
    this.executedScenarios = 0;
    this.testReport = this.createEmptyReport();

    // 启动监控
    this.startMonitoring();

    // 启动稳定性测试
    globalStabilityTester.startTest({
      duration: this.config.totalDuration,
      sampleInterval: Math.min(this.config.memoryCheckInterval, this.config.performanceCheckInterval),
      autoCleanup: this.config.autoCleanup,
      reportCallback: (report) => {
        this.testReport.stabilityScore = report.summary.stabilityScore;
        this.testReport.memoryLeaks = report.memoryLeakDetected;
        this.testReport.performanceDegradation = report.performanceDegradation;
        this.testReport.resourceLeaks = report.resourceLeaks;
      }
    });

    try {
      // 执行测试场景
      await this.executeScenarios();

      // 等待测试完成
      await this.waitForTestCompletion();

    } catch (error) {
      console.error('长时间运行测试执行失败:', error);
      this.testReport.issues.push(`测试执行失败: ${error}`);
    } finally {
      this.stopTest();
    }
  }

  /**
   * 停止测试
   */
  stopTest(): LongRunningTestReport {
    if (!this.isRunning) {
      console.warn('长时间运行测试未在进行中');
      return this.testReport;
    }

    this.isRunning = false;
    this.stopMonitoring();
    
    // 停止稳定性测试
    globalStabilityTester.stopTest();

    // 完成测试报告
    this.testReport.testDuration = Date.now() - this.startTime;
    this.testReport.scenariosExecuted = this.executedScenarios;
    this.generateRecommendations();

    console.log('长时间运行测试完成', {
      duration: `${this.testReport.testDuration / 1000 / 60}分钟`,
      scenarios: this.testReport.scenariosExecuted,
      stabilityScore: this.testReport.stabilityScore,
      issues: this.testReport.issues.length
    });

    if (this.config.reportCallback) {
      this.config.reportCallback(this.testReport);
    }

    return this.testReport;
  }

  /**
   * 获取默认测试场景
   */
  private getDefaultScenarios(): TestScenario[] {
    return [
      {
        name: '基础功能测试',
        description: '测试基本的地图操作和数据加载',
        duration: 10 * 60 * 1000, // 10分钟
        actions: [
          {
            delay: 0,
            action: async () => {
              console.log('开始基础功能测试...');
              // 模拟地图操作
              const mapStore = useMapStore.getState();
              if (mapStore.initializeScenarioSystems) {
                mapStore.initializeScenarioSystems();
              }
            },
            description: '初始化地图系统'
          },
          {
            delay: 2 * 60 * 1000, // 2分钟后
            action: async () => {
              // 模拟实时数据启动
              const realtimeStore = useRealtimeStore.getState();
              if (realtimeStore.startRealtime) {
                realtimeStore.startRealtime();
              }
            },
            description: '启动实时数据模拟'
          },
          {
            delay: 5 * 60 * 1000, // 5分钟后
            action: async () => {
              // 模拟数据清理
              const realtimeStore = useRealtimeStore.getState();
              if (realtimeStore.cleanupOldData) {
                realtimeStore.cleanupOldData();
              }
            },
            description: '清理旧数据'
          }
        ]
      },
      {
        name: '压力测试',
        description: '高负载下的系统稳定性测试',
        duration: 20 * 60 * 1000, // 20分钟
        actions: [
          {
            delay: 0,
            action: async () => {
              console.log('开始压力测试...');
              // 创建大量定时器模拟高负载
              for (let i = 0; i < 50; i++) {
                globalTimerManager.setInterval(`stress-test-${i}`, () => {
                  // 模拟计算密集型任务
                  const start = Date.now();
                  while (Date.now() - start < 1) {
                    Math.random();
                  }
                }, 100);
              }
            },
            description: '创建高负载定时器'
          },
          {
            delay: 10 * 60 * 1000, // 10分钟后
            action: async () => {
              // 清理一半定时器
              for (let i = 0; i < 25; i++) {
                globalTimerManager.clearInterval(`stress-test-${i}`);
              }
            },
            description: '部分清理定时器'
          },
          {
            delay: 18 * 60 * 1000, // 18分钟后
            action: async () => {
              // 清理剩余定时器
              for (let i = 25; i < 50; i++) {
                globalTimerManager.clearInterval(`stress-test-${i}`);
              }
            },
            description: '完全清理定时器'
          }
        ]
      },
      {
        name: '内存泄漏测试',
        description: '检测和处理内存泄漏',
        duration: 15 * 60 * 1000, // 15分钟
        actions: [
          {
            delay: 0,
            action: async () => {
              console.log('开始内存泄漏测试...');
              // 模拟内存泄漏场景
              const leakyObjects: any[] = [];
              for (let i = 0; i < 1000; i++) {
                leakyObjects.push({
                  id: i,
                  data: new Array(1000).fill(Math.random()),
                  timestamp: Date.now()
                });
              }
              // 故意不清理这些对象
            },
            description: '创建潜在内存泄漏'
          },
          {
            delay: 5 * 60 * 1000, // 5分钟后
            action: async () => {
              // 触发垃圾回收
              if (typeof global !== 'undefined' && global.gc) {
                global.gc();
              } else if (typeof window !== 'undefined' && (window as any).gc) {
                (window as any).gc();
              }
            },
            description: '触发垃圾回收'
          },
          {
            delay: 10 * 60 * 1000, // 10分钟后
            action: async () => {
              // 强制内存清理
              globalPerformanceOptimizer.forceMemoryCleanup();
            },
            description: '强制内存清理'
          }
        ]
      },
      {
        name: '资源管理测试',
        description: '测试资源的正确分配和释放',
        duration: 15 * 60 * 1000, // 15分钟
        actions: [
          {
            delay: 0,
            action: async () => {
              console.log('开始资源管理测试...');
              // 注册大量组件
              for (let i = 0; i < 100; i++) {
                globalResourceManager.registerCleanup(`test-component-${i}`, () => {
                  console.log(`清理组件 test-component-${i}`);
                });
              }
            },
            description: '注册大量组件'
          },
          {
            delay: 5 * 60 * 1000, // 5分钟后
            action: async () => {
              // 清理一半组件
              for (let i = 0; i < 50; i++) {
                globalResourceManager.unregisterCleanup(`test-component-${i}`);
              }
            },
            description: '部分清理组件'
          },
          {
            delay: 12 * 60 * 1000, // 12分钟后
            action: async () => {
              // 清理剩余组件
              for (let i = 50; i < 100; i++) {
                globalResourceManager.unregisterCleanup(`test-component-${i}`);
              }
            },
            description: '完全清理组件'
          }
        ]
      }
    ];
  }

  /**
   * 执行测试场景
   */
  private async executeScenarios(): Promise<void> {
    for (const scenario of this.config.scenarios) {
      if (!this.isRunning) break;

      console.log(`执行测试场景: ${scenario.name}`);
      this.executedScenarios++;

      // 执行场景中的所有动作
      const scenarioPromises = scenario.actions.map(action => 
        new Promise<void>((resolve) => {
          globalTimerManager.setTimeout(`scenario-action-${Date.now()}-${Math.random()}`, async () => {
            try {
              console.log(`执行动作: ${action.description}`);
              await action.action();
            } catch (error) {
              console.error(`动作执行失败: ${action.description}`, error);
              this.testReport.issues.push(`动作执行失败: ${action.description} - ${error}`);
            }
            resolve();
          }, action.delay);
        })
      );

      // 等待场景完成
      await Promise.all(scenarioPromises);
      
      // 场景间隔
      await new Promise(resolve => {
        globalTimerManager.setTimeout(`scenario-interval-${Date.now()}`, () => resolve(undefined), 2000);
      });
    }
  }

  /**
   * 等待测试完成
   */
  private async waitForTestCompletion(): Promise<void> {
    const remainingTime = this.config.totalDuration - (Date.now() - this.startTime);
    if (remainingTime > 0) {
      console.log(`等待测试完成，剩余时间: ${remainingTime / 1000 / 60}分钟`);
      await new Promise(resolve => {
        globalTimerManager.setTimeout('test-completion-wait', () => resolve(undefined), remainingTime);
      });
    }
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    // 内存监控
    const memoryTimerId = 'long-running-memory-monitor';
    globalTimerManager.setInterval(memoryTimerId, () => {
      this.collectMemoryMetrics();
    }, this.config.memoryCheckInterval);
    this.monitoringTimers.push(memoryTimerId);

    // 性能监控
    const performanceTimerId = 'long-running-performance-monitor';
    globalTimerManager.setInterval(performanceTimerId, () => {
      this.collectPerformanceMetrics();
    }, this.config.performanceCheckInterval);
    this.monitoringTimers.push(performanceTimerId);

    // 资源监控
    const resourceTimerId = 'long-running-resource-monitor';
    globalTimerManager.setInterval(resourceTimerId, () => {
      this.collectResourceMetrics();
    }, this.config.memoryCheckInterval);
    this.monitoringTimers.push(resourceTimerId);
  }

  /**
   * 停止监控
   */
  private stopMonitoring(): void {
    this.monitoringTimers.forEach(timerId => {
      globalTimerManager.clearInterval(timerId);
    });
    this.monitoringTimers = [];
  }

  /**
   * 收集内存指标
   */
  private collectMemoryMetrics(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.testReport.detailedMetrics.memoryUsage.push({
        timestamp: Date.now(),
        usage: memory.usedJSHeapSize
      });
    }
  }

  /**
   * 收集性能指标
   */
  private collectPerformanceMetrics(): void {
    const stats = globalPerformanceOptimizer.getPerformanceMetrics() || {
        fps: 60,
        memoryUsage: 50,
        renderTime: 0,
        visibleFeatures: 0,
        culledFeatures: 0,
        activeAnimations: 0,
        optimizationCount: 0,
        lastOptimization: 0
      };
    this.testReport.detailedMetrics.performanceMetrics.push({
      timestamp: Date.now(),
      fps: stats.fps || 60,
      renderTime: stats.renderTime || 16
    });
  }

  /**
   * 收集资源指标
   */
  private collectResourceMetrics(): void {
    const timerStats = globalTimerManager.getStats();
    const componentCount = globalResourceManager.getRegisteredComponentsCount();
    
    this.testReport.detailedMetrics.resourceUsage.push({
      timestamp: Date.now(),
      timers: timerStats.total,
      components: componentCount
    });
  }

  /**
   * 生成建议
   */
  private generateRecommendations(): void {
    const recommendations: string[] = [];

    if (this.testReport.memoryLeaks) {
      recommendations.push('检测到内存泄漏，建议检查事件监听器和定时器的清理逻辑');
      recommendations.push('考虑增加自动内存清理的频率');
    }

    if (this.testReport.performanceDegradation) {
      recommendations.push('检测到性能衰减，建议优化渲染逻辑和动画系统');
      recommendations.push('考虑实施更积极的LOD策略');
    }

    if (this.testReport.resourceLeaks) {
      recommendations.push('检测到资源泄漏，建议检查组件的清理逻辑');
      recommendations.push('确保所有注册的资源在不需要时正确释放');
    }

    if (this.testReport.issues.length > 0) {
      recommendations.push('测试过程中发现问题，建议查看详细日志进行排查');
    }

    if (this.testReport.stabilityScore < 70) {
      recommendations.push('稳定性评分较低，建议进行全面的性能优化');
    }

    if (recommendations.length === 0) {
      recommendations.push('应用在长时间运行测试中表现良好');
      recommendations.push('建议继续定期进行稳定性测试');
    }

    this.testReport.recommendations = recommendations;
  }

  /**
   * 创建空报告
   */
  private createEmptyReport(): LongRunningTestReport {
    return {
      testDuration: 0,
      scenariosExecuted: 0,
      memoryLeaks: false,
      performanceDegradation: false,
      resourceLeaks: false,
      stabilityScore: 0,
      issues: [],
      recommendations: [],
      detailedMetrics: {
        memoryUsage: [],
        performanceMetrics: [],
        resourceUsage: []
      }
    };
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isRunning: boolean;
    testDuration: number;
    executedScenarios: number;
    totalScenarios: number;
  } {
    return {
      isRunning: this.isRunning,
      testDuration: this.isRunning ? Date.now() - this.startTime : 0,
      executedScenarios: this.executedScenarios,
      totalScenarios: this.config.scenarios.length
    };
  }

  /**
   * 获取最新报告
   */
  getLatestReport(): LongRunningTestReport {
    return { ...this.testReport };
  }

  /**
   * 销毁测试器
   */
  destroy(): void {
    if (this.isRunning) {
      this.stopTest();
    }
    console.log('长时间运行测试器已销毁');
  }
}

// 导出单例实例
export const globalLongRunningTest = LongRunningTest.getInstance();

// 导出类型
export type { TestScenario, LongRunningTestConfig, LongRunningTestReport };

export default LongRunningTest;