import { Settings, Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';
import ScenarioButtons from './ScenarioButtons';

interface TopBarProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
  isDrawerOpen: boolean;
}

export default function TopBar({ onMenuClick, onSettingsClick, isDrawerOpen }: TopBarProps) {
  return (
    <motion.div 
      className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* 左侧：品牌标识和菜单按钮 */}
        <div className="flex items-center space-x-4">
          <motion.button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 group"
            aria-label={isDrawerOpen ? '关闭面板' : '打开面板'}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              initial={false}
              animate={{ rotate: isDrawerOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isDrawerOpen ? (
                <X className="w-5 h-5 text-gray-300 group-hover:text-white" />
              ) : (
                <Menu className="w-5 h-5 text-gray-300 group-hover:text-white" />
              )}
            </motion.div>
          </motion.button>
          
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <span className="text-white font-bold text-sm">R</span>
            </motion.div>
            <h1 className="text-xl font-bold text-white hidden sm:block">
              Runway 1331 智慧物業中控系統
            </h1>
            <h1 className="text-lg font-bold text-white sm:hidden">
              R1331
            </h1>
          </motion.div>
        </div>
        
        {/* 中间：场景模式按钮 */}
        <motion.div 
          className="flex items-center space-x-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <ScenarioButtons />
        </motion.div>
        
        {/* 右侧：状态指示器和设置按钮 */}
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {/* 系统状态指示器 */}
          <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg px-3 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300 hidden md:inline">系統正常</span>
            <span className="text-sm text-gray-300 md:hidden">正常</span>
          </div>
          
          {/* 连接状态 */}
          <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg px-3 py-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300 hidden lg:inline">實時連接</span>
            <span className="text-sm text-gray-300 lg:hidden">連接</span>
          </div>
          
          {/* 设置按钮 */}
          <motion.button
            onClick={onSettingsClick}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 group"
            aria-label="系統設置"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="w-5 h-5 text-gray-300 group-hover:text-white group-hover:rotate-90 transition-all duration-200" />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}