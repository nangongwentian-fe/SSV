import { create } from 'zustand';
import { ParkingStatus } from '../types';

interface ParkingStore {
  parkingStatus: ParkingStatus;
  updateParkingStatus: (status: Partial<ParkingStatus>) => void;
  updateOccupancy: (occupiedSpaces: number) => void;
  addRevenue: (amount: number) => void;
  generateRandomParkingData: () => void;
}

export const useParkingStore = create<ParkingStore>((set, get) => ({
  parkingStatus: {
    totalSpaces: 200,
    occupiedSpaces: 156,
    availableSpaces: 44,
    occupancyRate: 78.0,
    revenueToday: 2340.50,
    averageStayTime: 3.2,
  },
  
  updateParkingStatus: (status) => set((state) => {
    const newStatus = { ...state.parkingStatus, ...status };
    // 自动计算可用车位和占用率
    if ('occupiedSpaces' in status || 'totalSpaces' in status) {
      newStatus.availableSpaces = newStatus.totalSpaces - newStatus.occupiedSpaces;
      newStatus.occupancyRate = Math.round((newStatus.occupiedSpaces / newStatus.totalSpaces) * 1000) / 10;
    }
    return { parkingStatus: newStatus };
  }),
  
  updateOccupancy: (occupiedSpaces) => {
    const { totalSpaces } = get().parkingStatus;
    const availableSpaces = totalSpaces - occupiedSpaces;
    const occupancyRate = Math.round((occupiedSpaces / totalSpaces) * 1000) / 10;
    
    set((state) => ({
      parkingStatus: {
        ...state.parkingStatus,
        occupiedSpaces,
        availableSpaces,
        occupancyRate,
      }
    }));
  },
  
  addRevenue: (amount) => set((state) => ({
    parkingStatus: {
      ...state.parkingStatus,
      revenueToday: Math.round((state.parkingStatus.revenueToday + amount) * 100) / 100,
    }
  })),
  
  generateRandomParkingData: () => {
    const { totalSpaces } = get().parkingStatus;
    const occupiedSpaces = Math.floor(Math.random() * totalSpaces * 0.4 + totalSpaces * 0.5); // 50-90%占用率
    const availableSpaces = totalSpaces - occupiedSpaces;
    const occupancyRate = Math.round((occupiedSpaces / totalSpaces) * 1000) / 10;
    const revenueToday = Math.round((Math.random() * 1000 + 2000) * 100) / 100;
    const averageStayTime = Math.round((Math.random() * 3 + 2) * 10) / 10;
    
    set({
      parkingStatus: {
        totalSpaces,
        occupiedSpaces,
        availableSpaces,
        occupancyRate,
        revenueToday,
        averageStayTime,
      }
    });
  },
}));