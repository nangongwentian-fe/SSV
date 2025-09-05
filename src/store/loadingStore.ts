import { create } from 'zustand';

interface LoadingState {
  isLoading: boolean;
  loadingText: string;
  loadingTasks: Map<string, string>;
  setLoading: (loading: boolean, text?: string) => void;
  addLoadingTask: (taskId: string, text: string) => void;
  removeLoadingTask: (taskId: string) => void;
  clearAllTasks: () => void;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  isLoading: false,
  loadingText: '加载中...',
  loadingTasks: new Map(),

  setLoading: (loading: boolean, text = '加载中...') => {
    set({ isLoading: loading, loadingText: text });
  },

  addLoadingTask: (taskId: string, text: string) => {
    const { loadingTasks } = get();
    const newTasks = new Map(loadingTasks);
    newTasks.set(taskId, text);
    
    set({ 
      loadingTasks: newTasks,
      isLoading: newTasks.size > 0,
      loadingText: Array.from(newTasks.values())[0] || '加载中...'
    });
  },

  removeLoadingTask: (taskId: string) => {
    const { loadingTasks } = get();
    const newTasks = new Map(loadingTasks);
    newTasks.delete(taskId);
    
    set({ 
      loadingTasks: newTasks,
      isLoading: newTasks.size > 0,
      loadingText: Array.from(newTasks.values())[0] || '加载中...'
    });
  },

  clearAllTasks: () => {
    set({ 
      loadingTasks: new Map(),
      isLoading: false,
      loadingText: '加载中...'
    });
  }
}));