import { create } from 'zustand';
import { KPIData } from '../types';

interface KPIStore {
  kpiData: KPIData;
  updateKPIData: (data: Partial<KPIData>) => void;
  generateRandomKPIData: () => void;
}

export const useKPIStore = create<KPIStore>((set) => ({
  kpiData: {
    energyConsumption: 85.2,
    waterUsage: 67.8,
    occupancyRate: 78.5,
    maintenanceEfficiency: 92.3,
    securityScore: 88.7,
    environmentalScore: 76.4,
    temperature: 24.5,
    humidity: 65.2,
    airQuality: 85,
    noiseLevel: 45.3,
    onlineUsers: 1247
  },
  
  updateKPIData: (data) => set((state) => ({
    kpiData: { ...state.kpiData, ...data }
  })),
  
  generateRandomKPIData: () => set((state) => ({
    kpiData: {
      energyConsumption: Math.round((Math.random() * 30 + 70) * 10) / 10,
      waterUsage: Math.round((Math.random() * 40 + 50) * 10) / 10,
      occupancyRate: Math.round((Math.random() * 30 + 60) * 10) / 10,
      maintenanceEfficiency: Math.round((Math.random() * 20 + 80) * 10) / 10,
      securityScore: Math.round((Math.random() * 25 + 75) * 10) / 10,
      environmentalScore: Math.round((Math.random() * 35 + 65) * 10) / 10,
      temperature: Math.round((Math.random() * 10 + 20) * 10) / 10,
      humidity: Math.round((Math.random() * 30 + 50) * 10) / 10,
      airQuality: Math.round(Math.random() * 50 + 50),
      noiseLevel: Math.round((Math.random() * 20 + 35) * 10) / 10,
      onlineUsers: Math.round(Math.random() * 500 + 1000)
    }
  })),
}));