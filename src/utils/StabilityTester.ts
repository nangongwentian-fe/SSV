/**
 * 长时间稳定性测试工具
 * 监控应用的内存使用、性能指标和资源泄漏情况
 */
import { globalTimerManager } from './TimerManager';
import { globalPerformanceOptimizer } from './PerformanceOptimizer';
import { globalMemoryLeakDetector } from './MemoryLeakDetector';
import { globalResourceManager } from './ResourceManager';

interface StabilityMetrics {
  timestamp: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  performance: {
    fps: number;
    renderTime: number;
    frameDrops: number;
  };
  resources: {
    activeTimers: number;
    activeComponents: number;
    activeAnimations: number;
  };
  stability: {
    memoryGrowthRate: number; // MB/hour
    performanceDegradation: number; // %
    resourceLeakScore: number; // 0-100
  };
}

interface StabilityTestConfig {
  duration: number; // 测试持续时间（毫秒）
  sampleInterval: number; // 采样间隔（毫秒）
  memoryThreshold: number; // 内存增长阈值（MB/hour）
  performanceThreshold: number; // 性能衰减阈值（%）
  autoCleanup: boolean; // 自动清理
  reportCallback?: (report: StabilityReport) => void;
}

interface StabilityReport {
  testDuration: number;
  totalSamples: number;
  memoryLeakDetected: boolean;
  performanceDegradation: boolean;
  resourceLeaks: boolean;
  recommendations: string[];
  metrics: StabilityMetrics[];
  summary: {
    avgMemoryGrowth: number;
    avgPerformanceLoss: number;
    maxResourceUsage: number;
    stabilityScore: number; // 0-100
  };
}

class StabilityTester {
  private static instance: StabilityTester;
  private config: StabilityTestConfig;
  private metrics: StabilityMetrics[] = [];
  private testStartTime = 0;
  private isRunning = false;
  private testTimerId = 'stability-test';
  private baselineMetrics?: StabilityMetrics;

  private constructor() {
    this.config = {
      duration: 30 * 60 * 1000, // 30分钟
      sampleInterval: 10 * 1000, // 10秒
      memoryThreshold: 50, // 50MB/hour
      performanceThreshold: 10, // 10%
      autoCleanup: true
    };
  }

  static getInstance(): StabilityTester {
    if (!StabilityTester.instance) {
      StabilityTester.instance = new StabilityTester();
    }
    return StabilityTester.instance;
  }

  /**
   * 开始稳定性测试
   */
  startTest(config?: Partial<StabilityTestConfig>): void {
    if (this.isRunning) {
      console.warn('稳定性测试已在运行');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('开始长时间稳定性测试...', {
      duration: `${this.config.duration / 1000 / 60}分钟`,
      sampleInterval: `${this.config.sampleInterval / 1000}秒`,
      memoryThreshold: `${this.config.memoryThreshold}MB/hour`,
      performanceThreshold: `${this.config.performanceThreshold}%`
    });

    // 启用内存泄漏检测
    globalMemoryLeakDetector.start({
      enabled: true,
      checkInterval: this.config.sampleInterval,
      autoCleanup: this.config.autoCleanup
    });

    this.testStartTime = Date.now();
    this.metrics = [];
    this.isRunning = true;

    // 创建基线指标
    this.baselineMetrics = this.collectMetrics();
    this.metrics.push(this.baselineMetrics);

    // 开始定期采样
    globalTimerManager.setInterval(this.testTimerId, () => {
      this.performSample();
    }, this.config.sampleInterval);

    // 设置测试结束定时器
    globalTimerManager.setTimeout(`${this.testTimerId}-end`, () => {
      this.stopTest();
    }, this.config.duration);
  }

  /**
   * 停止稳定性测试
   */
  stopTest(): StabilityReport {
    if (!this.isRunning) {
      console.warn('稳定性测试未在运行');
      return this.generateEmptyReport();
    }

    globalTimerManager.clearInterval(this.testTimerId);
    globalTimerManager.clearTimeout(`${this.testTimerId}-end`);
    this.isRunning = false;

    const report = this.generateReport();
    
    console.log('稳定性测试完成', {
      duration: `${report.testDuration / 1000 / 60}分钟`,
      samples: report.totalSamples,
      stabilityScore: `${report.summary.stabilityScore}/100`,
      memoryLeak: report.memoryLeakDetected ? '检测到' : '未检测到',
      performanceDegradation: report.performanceDegradation ? '检测到' : '未检测到'
    });

    if (this.config.reportCallback) {
      this.config.reportCallback(report);
    }

    return report;
  }

  /**
   * 执行采样
   */
  private performSample(): void {
    try {
      const metrics = this.collectMetrics();
      this.metrics.push(metrics);

      // 检查是否需要提前结束测试
      if (this.shouldStopEarly(metrics)) {
        console.warn('检测到严重问题，提前结束稳定性测试');
        this.stopTest();
      }

      // 定期清理旧数据以防止内存占用过多
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-500); // 保留最近500个样本
      }

    } catch (error) {
      console.error('稳定性测试采样失败:', error);
    }
  }

  /**
   * 收集当前指标
   */
  private collectMetrics(): StabilityMetrics {
    // 获取内存信息
    let memoryUsage = {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };

    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    // 获取性能信息
    const performanceStats = globalPerformanceOptimizer.getPerformanceMetrics() || {
        fps: 60,
        memoryUsage: 50,
        renderTime: 0,
        visibleFeatures: 0,
        culledFeatures: 0,
        activeAnimations: 0,
        optimizationCount: 0,
        lastOptimization: 0
      };
    const timerStats = globalTimerManager.getStats();

    const performance = {
      fps: performanceStats.fps || 60,
      renderTime: performanceStats.renderTime || 16,
      frameDrops: 0 // PerformanceOptimizer中没有frameDrops，设为0
    };

    const resources = {
      activeTimers: timerStats.total,
      activeComponents: 0, // 暂时设为0，后续可以从其他地方获取
      activeAnimations: performanceStats.activeAnimations || 0
    };

    // 计算稳定性指标
    const stability = this.calculateStabilityMetrics(memoryUsage, performance, resources);

    return {
      timestamp: Date.now(),
      memoryUsage,
      performance,
      resources,
      stability
    };
  }

  /**
   * 计算稳定性指标
   */
  private calculateStabilityMetrics(
    memoryUsage: StabilityMetrics['memoryUsage'],
    performance: StabilityMetrics['performance'],
    resources: StabilityMetrics['resources']
  ): StabilityMetrics['stability'] {
    let memoryGrowthRate = 0;
    let performanceDegradation = 0;
    let resourceLeakScore = 0;

    if (this.baselineMetrics && this.metrics.length > 1) {
      const timeElapsed = (Date.now() - this.testStartTime) / (1000 * 60 * 60); // 小时
      
      // 计算内存增长率 (MB/hour)
      const memoryGrowth = (memoryUsage.usedJSHeapSize - this.baselineMetrics.memoryUsage.usedJSHeapSize) / (1024 * 1024);
      memoryGrowthRate = timeElapsed > 0 ? memoryGrowth / timeElapsed : 0;

      // 计算性能衰减
      const baselineFPS = this.baselineMetrics.performance.fps;
      performanceDegradation = baselineFPS > 0 ? ((baselineFPS - performance.fps) / baselineFPS) * 100 : 0;

      // 计算资源泄漏评分
      const baselineResources = this.baselineMetrics.resources.activeTimers + 
                               this.baselineMetrics.resources.activeComponents + 
                               this.baselineMetrics.resources.activeAnimations;
      const currentResources = resources.activeTimers + resources.activeComponents + resources.activeAnimations;
      
      if (baselineResources > 0) {
        const resourceGrowth = ((currentResources - baselineResources) / baselineResources) * 100;
        resourceLeakScore = Math.min(100, Math.max(0, resourceGrowth));
      }
    }

    return {
      memoryGrowthRate,
      performanceDegradation,
      resourceLeakScore
    };
  }

  /**
   * 检查是否应该提前停止测试
   */
  private shouldStopEarly(metrics: StabilityMetrics): boolean {
    // 内存增长过快
    if (metrics.stability.memoryGrowthRate > this.config.memoryThreshold * 2) {
      return true;
    }

    // 性能衰减严重
    if (metrics.stability.performanceDegradation > this.config.performanceThreshold * 3) {
      return true;
    }

    // 资源泄漏严重
    if (metrics.stability.resourceLeakScore > 80) {
      return true;
    }

    return false;
  }

  /**
   * 生成测试报告
   */
  private generateReport(): StabilityReport {
    const testDuration = Date.now() - this.testStartTime;
    const totalSamples = this.metrics.length;

    if (totalSamples === 0) {
      return this.generateEmptyReport();
    }

    // 分析内存泄漏
    const memoryGrowthRates = this.metrics.map(m => m.stability.memoryGrowthRate);
    const avgMemoryGrowth = memoryGrowthRates.reduce((sum, rate) => sum + rate, 0) / memoryGrowthRates.length;
    const memoryLeakDetected = avgMemoryGrowth > this.config.memoryThreshold;

    // 分析性能衰减
    const performanceLosses = this.metrics.map(m => m.stability.performanceDegradation);
    const avgPerformanceLoss = performanceLosses.reduce((sum, loss) => sum + loss, 0) / performanceLosses.length;
    const performanceDegradation = avgPerformanceLoss > this.config.performanceThreshold;

    // 分析资源泄漏
    const resourceScores = this.metrics.map(m => m.stability.resourceLeakScore);
    const maxResourceUsage = Math.max(...resourceScores);
    const resourceLeaks = maxResourceUsage > 50;

    // 计算稳定性评分
    const stabilityScore = this.calculateStabilityScore(
      avgMemoryGrowth,
      avgPerformanceLoss,
      maxResourceUsage
    );

    // 生成建议
    const recommendations = this.generateRecommendations(
      memoryLeakDetected,
      performanceDegradation,
      resourceLeaks,
      avgMemoryGrowth,
      avgPerformanceLoss,
      maxResourceUsage
    );

    return {
      testDuration,
      totalSamples,
      memoryLeakDetected,
      performanceDegradation,
      resourceLeaks,
      recommendations,
      metrics: this.metrics,
      summary: {
        avgMemoryGrowth,
        avgPerformanceLoss,
        maxResourceUsage,
        stabilityScore
      }
    };
  }

  /**
   * 计算稳定性评分
   */
  private calculateStabilityScore(
    memoryGrowth: number,
    performanceLoss: number,
    resourceUsage: number
  ): number {
    let score = 100;

    // 内存增长扣分
    if (memoryGrowth > this.config.memoryThreshold) {
      score -= Math.min(30, (memoryGrowth / this.config.memoryThreshold) * 10);
    }

    // 性能衰减扣分
    if (performanceLoss > this.config.performanceThreshold) {
      score -= Math.min(30, (performanceLoss / this.config.performanceThreshold) * 10);
    }

    // 资源使用扣分
    if (resourceUsage > 50) {
      score -= Math.min(40, (resourceUsage / 50) * 20);
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    memoryLeak: boolean,
    performanceDegradation: boolean,
    resourceLeaks: boolean,
    memoryGrowth: number,
    performanceLoss: number,
    resourceUsage: number
  ): string[] {
    const recommendations: string[] = [];

    if (memoryLeak) {
      recommendations.push(`检测到内存泄漏 (${memoryGrowth.toFixed(2)}MB/hour)，建议检查事件监听器和定时器清理`);
      recommendations.push('启用自动内存清理机制');
      recommendations.push('增加内存监控频率');
    }

    if (performanceDegradation) {
      recommendations.push(`检测到性能衰减 (${performanceLoss.toFixed(2)}%)，建议优化渲染逻辑`);
      recommendations.push('检查动画和渲染循环是否有性能问题');
      recommendations.push('考虑实施更积极的LOD策略');
    }

    if (resourceLeaks) {
      recommendations.push(`检测到资源泄漏 (评分: ${resourceUsage.toFixed(0)})，建议检查组件清理逻辑`);
      recommendations.push('确保所有定时器和动画在组件卸载时正确清理');
      recommendations.push('检查是否有未释放的事件监听器');
    }

    if (recommendations.length === 0) {
      recommendations.push('应用运行稳定，未检测到明显问题');
      recommendations.push('建议继续定期进行稳定性测试');
    }

    return recommendations;
  }

  /**
   * 生成空报告
   */
  private generateEmptyReport(): StabilityReport {
    return {
      testDuration: 0,
      totalSamples: 0,
      memoryLeakDetected: false,
      performanceDegradation: false,
      resourceLeaks: false,
      recommendations: ['测试未运行或数据不足'],
      metrics: [],
      summary: {
        avgMemoryGrowth: 0,
        avgPerformanceLoss: 0,
        maxResourceUsage: 0,
        stabilityScore: 0
      }
    };
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isRunning: boolean;
    testDuration: number;
    samplesCollected: number;
    config: StabilityTestConfig;
  } {
    return {
      isRunning: this.isRunning,
      testDuration: this.isRunning ? Date.now() - this.testStartTime : 0,
      samplesCollected: this.metrics.length,
      config: { ...this.config }
    };
  }

  /**
   * 获取实时指标
   */
  getCurrentMetrics(): StabilityMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * 清理测试数据
   */
  clearTestData(): void {
    this.metrics = [];
    this.baselineMetrics = undefined;
    console.log('稳定性测试数据已清理');
  }

  /**
   * 销毁测试器
   */
  destroy(): void {
    if (this.isRunning) {
      this.stopTest();
    }
    this.clearTestData();
    console.log('稳定性测试器已销毁');
  }
}

// 导出单例实例
export const globalStabilityTester = StabilityTester.getInstance();

// 导出类型
export type { StabilityMetrics, StabilityTestConfig, StabilityReport };

export default StabilityTester;