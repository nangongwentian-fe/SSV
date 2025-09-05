import { create } from 'zustand';
import { FeedbackType } from '../components/ActionFeedback';

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

interface FeedbackState {
  feedbacks: FeedbackItem[];
  showFeedback: (type: FeedbackType, message: string, options?: Partial<FeedbackItem>) => string;
  hideFeedback: (id: string) => void;
  clearAllFeedbacks: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbacks: [],

  showFeedback: (type: FeedbackType, message: string, options = {}) => {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const feedback: FeedbackItem = {
      id,
      type,
      message,
      duration: 3000,
      position: 'top-right',
      ...options
    };

    set(state => ({
      feedbacks: [...state.feedbacks, feedback]
    }));

    // 自动移除反馈
    if (feedback.duration && feedback.duration > 0) {
      setTimeout(() => {
        get().hideFeedback(id);
      }, feedback.duration);
    }

    return id;
  },

  hideFeedback: (id: string) => {
    set(state => ({
      feedbacks: state.feedbacks.filter(feedback => feedback.id !== id)
    }));
  },

  clearAllFeedbacks: () => {
    set({ feedbacks: [] });
  }
}));

// 便捷方法
export const showSuccess = (message: string, options?: Partial<FeedbackItem>) => {
  return useFeedbackStore.getState().showFeedback('success', message, options);
};

export const showError = (message: string, options?: Partial<FeedbackItem>) => {
  return useFeedbackStore.getState().showFeedback('error', message, options);
};

export const showWarning = (message: string, options?: Partial<FeedbackItem>) => {
  return useFeedbackStore.getState().showFeedback('warning', message, options);
};

export const showInfo = (message: string, options?: Partial<FeedbackItem>) => {
  return useFeedbackStore.getState().showFeedback('info', message, options);
};