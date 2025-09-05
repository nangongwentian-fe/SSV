import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimerManager } from '../hooks/useCleanup';

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
      setHasChanges(false);
    }
  }, [isOpen]);

  const handleInputChange = (key: keyof SettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
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
            className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-700"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-white">系統設置</h3>
            <p className="text-sm text-gray-400 mt-1">配置地圖和系統參數</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="關閉設置"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Mapbox Token */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Mapbox Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={settings.mapboxToken}
                onChange={(e) => handleInputChange('mapboxToken', e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
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
            <p className="text-xs text-gray-500">
              用於顯示 Mapbox 地圖樣式，留空將使用 OpenStreetMap
            </p>
          </div>
          
          {/* 3D Tiles URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              3D Tiles URL
            </label>
            <input
              type="url"
              value={settings.tilesUrl}
              onChange={(e) => handleInputChange('tilesUrl', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="輸入 tileset.json URL"
            />
            <p className="text-xs text-gray-500">
              3D 建築模型數據源，支援 Cesium 3D Tiles 格式
            </p>
          </div>
          
          {/* 主题设置 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              主題模式
            </label>
            <select
              value={settings.theme}
              onChange={(e) => handleInputChange('theme', e.target.value as 'dark' | 'light')}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
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
                  settings.autoRefresh ? 'bg-orange-500' : 'bg-gray-600'
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
                <label className="block text-sm text-gray-400">
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
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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