import React from 'react';
import { useThemeStore } from '../store/themeStore';

export default function ThemeTestPage() {
  const { theme, setTheme, toggleTheme } = useThemeStore();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">主题切换测试页面</h1>
      
      <div className="space-y-4">
        <div>
          <p className="mb-2">当前主题: {theme}</p>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            切换主题
          </button>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={() => setTheme('light')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            设置为浅色主题
          </button>
          <button
            onClick={() => setTheme('dark')}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            设置为深色主题
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <h2 className="text-lg font-semibold mb-2">测试文本</h2>
          <p className="text-gray-800 dark:text-gray-200">
            这是一个测试文本，用于验证主题切换是否正常工作。
          </p>
        </div>
        
        <div className="mt-4">
          <p>HTML元素的class属性:</p>
          <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            {document.documentElement.className}
          </code>
        </div>
      </div>
    </div>
  );
}