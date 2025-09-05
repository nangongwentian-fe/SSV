import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OverviewTab from './tabs/OverviewTab';
import OperationsTab from './tabs/OperationsTab';
import EventsTab from './tabs/EventsTab';
import { SecurityTab } from './tabs/SecurityTab';
import ESGTab from './tabs/ESGTab';

interface DrawerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DrawerPanel({ isOpen, onClose }: DrawerPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', name: '概覽', icon: '📊', component: OverviewTab },
    { id: 'operations', name: '運維', icon: '⚙️', component: OperationsTab },
    { id: 'events', name: '活動聯動', icon: '🎪', component: EventsTab },
    { id: 'security', name: '安防/車場', icon: '🚗', component: SecurityTab },
    { id: 'esg', name: 'ESG/合規', icon: '🌱', component: ESGTab }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || OverviewTab;

  return (
    <>
      {/* 背景遮罩 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
      
      {/* 抽屉面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed top-16 right-0 h-[calc(100vh-4rem)] z-40 bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 w-full max-w-md lg:max-w-lg xl:max-w-xl shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
        <div className="h-full flex flex-col">
          {/* 面板头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">控制面板</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors lg:hidden"
              aria-label="關閉面板"
            >
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
          
          {/* 标签页导航 */}
          <div className="border-b border-gray-700 bg-gray-800/50">
            <div className="flex overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200
                    flex items-center space-x-2 min-w-0
                    ${activeTab === tab.id
                      ? 'border-orange-500 text-orange-500 bg-orange-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                    }
                  `}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span className="truncate">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 标签页内容 */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="p-4">
                <ActiveComponent />
              </div>
            </div>
          </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}