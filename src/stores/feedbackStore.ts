import { create } from 'zustand';
import { globalTimerManager } from '../utils/TimerManager';

interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

interface FeedbackState {
  messages: FeedbackMessage[];
  timers: Map<string, string>;
  addMessage: (type: FeedbackMessage['type'], message: string) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  showFeedback: (message: string, type: FeedbackMessage['type']) => void;
  destroy: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  messages: [],
  timers: new Map(),
  addMessage: (type, message) => {
    const id = Date.now().toString();
    const newMessage: FeedbackMessage = {
      id,
      type,
      message,
      timestamp: Date.now()
    };
    set((state) => ({ 
      messages: [...state.messages, newMessage] 
    }));
    
    // 自动移除消息（5秒后）
    globalTimerManager.setTimeout(`feedback-${id}`, () => {
      set((state) => ({
        messages: state.messages.filter(msg => msg.id !== id)
      }));
      get().timers.delete(id);
    }, 5000);
    
    get().timers.set(id, `feedback-${id}`);
  },
  removeMessage: (id) => {
    // 清理对应的定时器
    const timerId = get().timers.get(id);
    if (timerId) {
      globalTimerManager.clearTimeout(timerId);
      get().timers.delete(id);
    }
    
    set((state) => ({
      messages: state.messages.filter(msg => msg.id !== id)
    }));
  },
  clearMessages: () => {
    // 清理所有定时器
    get().timers.forEach(timerId => globalTimerManager.clearTimeout(timerId));
    get().timers.clear();
    set({ messages: [] });
  },
  showFeedback: (message, type = 'info') => {
    get().addMessage(type, message);
  },
  destroy: () => {
    // 清理所有定时器和消息
    get().timers.forEach(timerId => globalTimerManager.clearTimeout(timerId));
    get().timers.clear();
    set({ messages: [], timers: new Map() });
  }
}));