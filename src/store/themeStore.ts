import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  
  setTheme: (theme) => {
    set({ theme });
    // 保存到localStorage
    localStorage.setItem('theme', theme);
    // 应用主题到HTML元素
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  },
  
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      // 保存到localStorage
      localStorage.setItem('theme', newTheme);
      // 应用主题到HTML元素
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      return { theme: newTheme };
    });
  },
  
  initializeTheme: () => {
    // 初始化时从localStorage获取主题并应用
    const savedTheme = localStorage.getItem('theme') as Theme;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemTheme;
    
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    set({ theme });
  }
}));