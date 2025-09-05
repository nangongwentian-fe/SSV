import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimerManager } from '../hooks/useCleanup';
import { useThemeStore } from '../store/themeStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: SettingsData) => void;
}

interface SettingsData {
  mapboxToken: string;
  tilesUrl: string;
  theme: 'dark' | 'light';
  autoRefresh: boolean;
  refreshInterval: number;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const { theme, setTheme } = useThemeStore();
  const [settings, setSettings] = useState<SettingsData>({
    mapboxToken: '',
    tilesUrl: '',
    theme: 'dark',
    autoRefresh: true,
    refreshInterval: 5000
  });
  
  const [showToken, setShowToken] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { setTimeout } = useTimerManager();

  // 从localStorage加载设置
  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('runway1331-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Failed to parse saved settings:', error);
        }
      }
      // 确保设置中的主题与store同步（只在初始化时）
      setSettings(prev => ({ ...prev, theme }));
      setHasChanges(false);
    }
  }, [isOpen]); // 移除theme依赖，避免循环更新

  const handleInputChange = (key: keyof SettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // 如果是主题切换，立即应用
    if (key === 'theme') {
      setTheme(value);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 保存到localStorage
      localStorage.setItem('runway1331-settings', JSON.stringify(settings));
      
      // 调用外部保存回调
      if (onSave) {
        await onSave(settings);
      }
      
      setHasChanges(false);
      
      // 显示成功提示
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaultSettings: SettingsData = {
      mapboxToken: '',
      tilesUrl: '',
      theme: 'dark',
      autoRefresh: true,
      refreshInterval: 5000
    };
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('您有未保存的更改，確定要關閉嗎？')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <motion.div 
            className="bg-gray-900 dark:bg-gray-900 light:bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-700 dark:border-gray-700 light:border-gray-200"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 dark:border-gray-700 light:border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-white dark:text-white light:text-gray-900">系統設置</h3>
            <p className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 mt-1">配置地圖和系統參數</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 light:hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 light:hover:bg-gray-200 rounded-full transition-all duration-200 ease-in-out transform hover:scale-110"
            aria-label="關閉設置"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Mapbox Token */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700">
              Mapbox Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={settings.mapboxToken}
                onChange={(e) => handleInputChange('mapboxToken', e.target.value)}
                className="w-full bg-gray-800 dark:bg-gray-800 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg px-3 py-2 pr-10 text-white dark:text-white light:text-gray-900 placeholder-gray-400 dark:placeholder-gray-400 light:placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                placeholder="輸入 Mapbox Access Token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600">
              用於顯示 Mapbox 地圖樣式，留空將使用 OpenStreetMap
            </p>
          </div>
          
          {/* 3D Tiles URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700">
              3D Tiles URL
            </label>
            <input
              type="url"
              value={settings.tilesUrl}
              onChange={(e) => handleInputChange('tilesUrl', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="輸入 tileset.json URL"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600">
              3D 建築模型數據源，支援 Cesium 3D Tiles 格式
            </p>
          </div>
          
          {/* 主题设置 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700">
              主題模式
            </label>
            <select
              value={settings.theme}
              onChange={(e) => handleInputChange('theme', e.target.value as 'dark' | 'light')}
              className="w-full bg-gray-800 dark:bg-gray-800 light:bg-gray-100 border border-gray-600 dark:border-gray-600 light:border-gray-300 rounded-lg px-3 py-2 text-white dark:text-white light:text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              <option value="dark">深色模式</option>
              <option value="light">淺色模式</option>
            </select>
          </div>
          
          {/* 自动刷新设置 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                自動刷新數據
              </label>
              <button
                type="button"
                onClick={() => handleInputChange('autoRefresh', !settings.autoRefresh)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoRefresh ? 'bg-orange-500' : 'bg-gray-600 dark:bg-gray-600 light:bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {settings.autoRefresh && (
              <div className="space-y-2">
                <label className="block text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">
                  刷新間隔：{settings.refreshInterval / 1000}秒
                </label>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={settings.refreshInterval}
                  onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 dark:border-gray-700 light:border-gray-200">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-gray-300 dark:hover:text-gray-200 light:hover:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-600 light:hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-gray-300 dark:hover:text-gray-200 light:hover:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-600 light:hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 dark:disabled:bg-gray-600 light:disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}