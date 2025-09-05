import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingProvider } from "@/components/LoadingManager";
import { ToastProvider } from "@/components/Toast";
import PerformancePanel from "@/components/PerformancePanel";
import GlobalLoadingOverlay from "@/components/GlobalLoadingOverlay";
import GlobalFeedbackManager from "@/components/GlobalFeedbackManager";
import Home from "@/pages/Home";
import { handleError, ErrorType, ErrorSeverity } from "@/utils/errorHandler";
import { globalPerformanceOptimizer } from "@/utils/PerformanceOptimizer";
import { useCleanup } from "@/hooks/useCleanup";
import { useThemeStore } from "@/store/themeStore";

export default function App() {
  const [showPerformancePanel, setShowPerformancePanel] = React.useState(false);
  const { registerEventListener, registerCleanup } = useCleanup('App');
  const { initializeTheme } = useThemeStore();

  // 初始化主题
  React.useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // 启动性能优化器
  React.useEffect(() => {
    // 确保性能优化器已启动
    if (!globalPerformanceOptimizer.getStatus().isRunning) {
      globalPerformanceOptimizer.start();
    }
    
    // 注册性能优化器停止清理
    registerCleanup(() => {
      globalPerformanceOptimizer.stop();
    });
    
    // 键盘快捷键切换性能面板
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setShowPerformancePanel(prev => !prev);
      }
      
      // Ctrl+Shift+O 强制优化
      if (event.ctrlKey && event.shiftKey && event.key === 'O') {
        event.preventDefault();
        globalPerformanceOptimizer.forceOptimization();
        console.log('强制性能优化已触发');
      }
      
      // Ctrl+Shift+M 强制内存清理
      if (event.ctrlKey && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        globalPerformanceOptimizer.forceMemoryCleanup();
        console.log('强制内存清理已触发');
      }
    };
    
    // 注册键盘事件监听器
    registerEventListener(window, 'keydown', handleKeyPress);
  }, [registerEventListener, registerCleanup]);
  
  // 错误处理
  React.useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      handleError(new Error(event.message), ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'App',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(new Error(String(event.reason)), ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'App',
        type: 'unhandled_promise_rejection'
      });
    };
    
    // 注册错误事件监听器
    registerEventListener(window, 'error', handleUnhandledError);
    registerEventListener(window, 'unhandledrejection', handleUnhandledRejection);
  }, [registerEventListener]);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        handleError(error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
          component: 'App',
          errorInfo
        });
      }}
    >
      <ToastProvider>
        <LoadingProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
            </Routes>
            <Toaster 
              position="top-right" 
              theme="dark" 
              richColors 
              closeButton 
            />
          </Router>
          
          {/* 全局加载遮罩 */}
          <GlobalLoadingOverlay />
          
          {/* 全局反馈管理器 */}
          <GlobalFeedbackManager />
          
          {/* 性能监控面板 */}
          <PerformancePanel
            isVisible={showPerformancePanel}
            onToggle={() => setShowPerformancePanel(!showPerformancePanel)}
          />
        </LoadingProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
