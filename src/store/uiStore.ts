import { create } from 'zustand';
import { UIState } from '../types';

interface UIStore {
  uiState: UIState;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  updateUIState: (state: Partial<UIState>) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  uiState: {
    sidebarOpen: true,
    activeTab: 'overview',
    settingsOpen: false,
  },
  
  toggleSidebar: () => set((state) => ({
    uiState: {
      ...state.uiState,
      sidebarOpen: !state.uiState.sidebarOpen,
    }
  })),
  
  setSidebarOpen: (open) => set((state) => ({
    uiState: {
      ...state.uiState,
      sidebarOpen: open,
    }
  })),
  
  setActiveTab: (tab) => set((state) => ({
    uiState: {
      ...state.uiState,
      activeTab: tab,
    }
  })),
  
  toggleSettings: () => set((state) => ({
    uiState: {
      ...state.uiState,
      settingsOpen: !state.uiState.settingsOpen,
    }
  })),
  
  setSettingsOpen: (open) => set((state) => ({
    uiState: {
      ...state.uiState,
      settingsOpen: open,
    }
  })),
  
  updateUIState: (newState) => set((state) => ({
    uiState: {
      ...state.uiState,
      ...newState,
    }
  })),
}));