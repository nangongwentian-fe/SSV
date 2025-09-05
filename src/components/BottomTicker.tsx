import { useState, useEffect } from 'react';
import { Clock, Wifi, Database, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAutoCleanupTimer } from '../hooks/useCleanup';

interface BottomTickerProps {
  className?: string;
}

export default function BottomTicker({ className = '' }: BottomTickerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mtrCount, setMtrCount] = useState(180);
  const [taxiCount, setTaxiCount] = useState(95);
  const [runwayCount, setRunwayCount] = useState(0);

  // 更新时间
  const updateTime = () => {
    setCurrentTime(new Date());
  };

  // 模拟数据更新
  const updateData = () => {
    setMtrCount(prev => prev + Math.floor(Math.random() * 5) - 2);
    setTaxiCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
    setRunwayCount(prev => Math.max(0, prev + Math.floor(Math.random() * 2)));
  };

  // 使用自动清理定时器
  useAutoCleanupTimer('BottomTicker-time', updateTime, 1000, true);
  useAutoCleanupTimer('BottomTicker-data', updateData, 5000, true);

  // 初始化时间
  useEffect(() => {
    updateTime();
  }, []);

  const tickerMessages = [
    '🟢 系統運行正常',
    '📊 數據同步中',
    '🔄 自動更新已啟用',
    '🛡️ 安防系統在線',
    '⚡ 電力供應穩定',
    '🌡️ 環境監測正常',
    '🚗 車場系統運行中',
    '📡 網絡連接良好'
  ];

  return (
    <motion.div 
      className={`fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 ${className}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        {/* 左侧：实时数据指标 */}
        <motion.div 
          className="flex items-center space-x-6"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <motion.div 
            className="flex items-center space-x-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg px-3 py-1"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-gray-600 dark:text-gray-400">MTR:</span>
            <motion.span 
              className="text-green-400 font-mono font-medium min-w-[3ch] text-right"
              key={mtrCount}
              initial={{ scale: 1.2, color: "#10b981" }}
              animate={{ scale: 1, color: "#34d399" }}
              transition={{ duration: 0.2 }}
            >
              {mtrCount}
            </motion.span>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg px-3 py-1"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-gray-600 dark:text-gray-400">Taxi:</span>
            <motion.span 
              className="text-yellow-400 font-mono font-medium min-w-[3ch] text-right"
              key={taxiCount}
              initial={{ scale: 1.2, color: "#fbbf24" }}
              animate={{ scale: 1, color: "#fde047" }}
              transition={{ duration: 0.2 }}
            >
              {taxiCount}
            </motion.span>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg px-3 py-1"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-gray-600 dark:text-gray-400">Runway:</span>
            <motion.span 
              className="text-blue-400 font-mono font-medium min-w-[3ch] text-right"
              key={runwayCount}
              initial={{ scale: 1.2, color: "#3b82f6" }}
              animate={{ scale: 1, color: "#60a5fa" }}
              transition={{ duration: 0.2 }}
            >
              {runwayCount}
            </motion.span>
          </motion.div>
        </motion.div>
        
        {/* 中间：跑马灯消息 */}
        <motion.div 
          className="flex-1 mx-6 hidden md:block"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg h-8 overflow-hidden relative">
            <div className="h-full flex items-center">
              <div className="animate-marquee whitespace-nowrap text-gray-700 dark:text-gray-300 text-xs">
                {tickerMessages.map((message, index) => (
                  <span key={index} className="px-8">
                    {message}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* 右侧：系统状态和时间 */}
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {/* 连接状态指示器 */}
          <motion.div 
            className="flex items-center space-x-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg px-3 py-1"
            whileHover={{ scale: 1.05 }}
          >
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-xs hidden lg:inline">在線</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg px-3 py-1"
            whileHover={{ scale: 1.05 }}
          >
            <Database className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-xs hidden lg:inline">同步</span>
          </motion.div>
          
          {/* 当前时间 */}
          <motion.div 
            className="flex items-center space-x-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg px-3 py-1"
            whileHover={{ scale: 1.05 }}
          >
            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <motion.span 
              className="text-gray-700 dark:text-gray-300 font-mono text-xs"
              key={currentTime.getSeconds()}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1 }}
            >
              {currentTime.toLocaleTimeString('zh-HK', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </motion.span>
          </motion.div>
        </motion.div>
      </div>
      
      {/* 移动端简化版跑马灯 */}
      <motion.div 
        className="md:hidden px-4 pb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg h-6 overflow-hidden">
          <div className="h-full flex items-center">
            <div className="animate-marquee whitespace-nowrap text-gray-700 dark:text-gray-300 text-xs">
              {tickerMessages.slice(0, 4).map((message, index) => (
                <span key={index} className="px-6">
                  {message}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}