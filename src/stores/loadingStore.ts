import { create } from 'zustand';

interface LoadingState {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  loadingMessage: '',
  setLoading: (loading: boolean, message: string = '') => 
    set({ isLoading: loading, loadingMessage: message })
}));

// 添加一个全局方法来清除加载状态
(window as any).clearLoadingState = () => {
  useLoadingStore.getState().setLoading(false);
  console.log('Loading state cleared');
};

// 添加一个全局方法来显示加载状态
(window as any).showLoadingState = (message = '加载中...') => {
  useLoadingStore.getState().setLoading(true, message);
  console.log('Loading state shown:', message);
};