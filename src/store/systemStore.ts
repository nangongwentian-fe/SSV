import { create } from 'zustand';
import { SystemStatus } from '../types';

interface SystemStore {
  systemStatus: SystemStatus;
  updateSystemStatus: (status: Partial<SystemStatus>) => void;
  generateRandomSystemStatus: () => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
  systemStatus: {
    hvac: 'normal',
    lighting: 'normal',
    security: 'normal',
    elevator: 'warning',
    fireSystem: 'normal',
    waterSystem: 'normal',
  },
  
  updateSystemStatus: (status) => set((state) => ({
    systemStatus: { ...state.systemStatus, ...status }
  })),
  
  generateRandomSystemStatus: () => {
    const statuses: ('normal' | 'warning' | 'error')[] = ['normal', 'warning', 'error'];
    const getRandomStatus = () => {
      const rand = Math.random();
      if (rand < 0.7) return 'normal';
      if (rand < 0.9) return 'warning';
      return 'error';
    };
    
    set({
      systemStatus: {
        hvac: getRandomStatus(),
        lighting: getRandomStatus(),
        security: getRandomStatus(),
        elevator: getRandomStatus(),
        fireSystem: getRandomStatus(),
        waterSystem: getRandomStatus(),
      }
    });
  },
}));