import { create } from 'zustand';
import { DeviceStatus } from '../types';

interface DeviceStore {
  devices: DeviceStatus[];
  addDevice: (device: Omit<DeviceStatus, 'id' | 'lastUpdate'>) => void;
  updateDevice: (id: string, updates: Partial<DeviceStatus>) => void;
  removeDevice: (id: string) => void;
  updateDeviceStatus: (id: string, status: DeviceStatus['status']) => void;
  generateRandomDeviceData: () => void;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: [
    {
      id: 'hvac-001',
      name: '中央空调主机1',
      type: 'hvac',
      status: 'online',
      location: '机房A',
      lastUpdate: new Date(),
      value: 22.5,
      unit: '°C',
      uptime: '15天 8小时',
      nextMaintenance: '2024-02-15',
    },
    {
      id: 'light-001',
      name: '大厅照明系统',
      type: 'lighting',
      status: 'online',
      location: '1楼大厅',
      lastUpdate: new Date(),
      value: 85,
      unit: '%',
      uptime: '30天 12小时',
      nextMaintenance: '2024-03-01',
    },
    {
      id: 'sec-001',
      name: '主入口监控',
      type: 'security',
      status: 'online',
      location: '主入口',
      lastUpdate: new Date(),
      uptime: '45天 6小时',
      nextMaintenance: '2024-02-20',
    },
    {
      id: 'elev-001',
      name: '客梯1号',
      type: 'elevator',
      status: 'maintenance',
      location: 'A区',
      lastUpdate: new Date(),
      uptime: '0天 0小时',
      nextMaintenance: '2024-01-25',
    },
    {
      id: 'fire-001',
      name: '消防主控制器',
      type: 'fire',
      status: 'online',
      location: '消防控制室',
      lastUpdate: new Date(),
      uptime: '60天 18小时',
      nextMaintenance: '2024-04-01',
    },
    {
      id: 'water-001',
      name: '供水泵站',
      type: 'water',
      status: 'online',
      location: 'B2层',
      lastUpdate: new Date(),
      value: 3.2,
      unit: 'bar',
      uptime: '22天 14小时',
      nextMaintenance: '2024-02-28',
    },
  ],
  
  addDevice: (deviceData) => {
    const newDevice: DeviceStatus = {
      ...deviceData,
      id: `${deviceData.type}-${Date.now()}`,
      lastUpdate: new Date(),
      uptime: deviceData.uptime || '0天 0小时',
      nextMaintenance: deviceData.nextMaintenance || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    set((state) => ({
      devices: [...state.devices, newDevice]
    }));
  },
  
  updateDevice: (id, updates) => set((state) => ({
    devices: state.devices.map(device => 
      device.id === id 
        ? { ...device, ...updates, lastUpdate: new Date() }
        : device
    )
  })),
  
  removeDevice: (id) => set((state) => ({
    devices: state.devices.filter(device => device.id !== id)
  })),
  
  updateDeviceStatus: (id, status) => {
    get().updateDevice(id, { status });
  },
  
  generateRandomDeviceData: () => {
    const statuses: DeviceStatus['status'][] = ['online', 'offline', 'maintenance'];
    
    set((state) => ({
      devices: state.devices.map(device => {
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        let randomValue = device.value;
        
        if (device.type === 'hvac' && device.unit === '°C') {
          randomValue = Math.round((Math.random() * 10 + 18) * 10) / 10;
        } else if (device.type === 'lighting' && device.unit === '%') {
          randomValue = Math.round(Math.random() * 100);
        } else if (device.type === 'water' && device.unit === 'bar') {
          randomValue = Math.round((Math.random() * 2 + 2) * 10) / 10;
        }
        
        return {
          ...device,
          status: Math.random() > 0.8 ? randomStatus : device.status,
          value: randomValue,
          lastUpdate: new Date(),
        };
      })
    }));
  },
}));