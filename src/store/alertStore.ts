import { create } from 'zustand';
import { Alert } from '../types';

interface AlertStore {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  removeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  clearAllAlerts: () => void;
  generateRandomAlert: () => void;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [
    {
      id: '1',
      type: 'warning',
      message: '空調系統溫度異常',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      location: '大樓A區',
      resolved: false,
      priority: 'medium',
    },
    {
      id: '2',
      type: 'info',
      message: '電梯維護已完成',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      location: '大樓B區',
      resolved: false,
      priority: 'low',
    },
    {
      id: '3',
      type: 'error',
      message: '消防系統檢測到煙霧',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      location: '大樓C區',
      resolved: true,
      priority: 'critical',
    },
  ],
  
  addAlert: (alertData) => {
    const newAlert: Alert = {
      ...alertData,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts]
    }));
  },
  
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter(alert => alert.id !== id)
  })),
  
  resolveAlert: (id) => set((state) => ({
    alerts: state.alerts.map(alert => 
      alert.id === id ? { ...alert, resolved: true } : alert
    )
  })),
  
  clearAllAlerts: () => set({ alerts: [] }),
  
  generateRandomAlert: () => {
    const types: Alert['type'][] = ['info', 'warning', 'error', 'critical'];
    const priorities: Alert['priority'][] = ['low', 'medium', 'high', 'critical'];
    const locations = ['大樓A區', '大樓B區', '大樓C區', '停車場', '機房'];
    const messages = [
      '系統運行正常',
      '溫度異常警告',
      '設備故障',
      '緊急情況',
      '維護提醒'
    ];
    
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    get().addAlert({
      type: randomType,
      message: randomMessage,
      location: randomLocation,
      resolved: false,
      priority: randomPriority,
    });
  },
}));