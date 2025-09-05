import { create } from 'zustand';
import { WeatherSignal } from '../types';

interface WeatherStore {
  weatherSignal: WeatherSignal;
  updateWeatherSignal: (signal: Partial<WeatherSignal>) => void;
  generateRandomWeatherData: () => void;
}

export const useWeatherStore = create<WeatherStore>((set) => ({
  weatherSignal: {
    temperature: 24.5,
    humidity: 65,
    windSpeed: 2.3,
    pressure: 1013.2,
    condition: 'cloudy',
    timestamp: new Date(),
  },
  
  updateWeatherSignal: (signal) => set((state) => ({
    weatherSignal: {
      ...state.weatherSignal,
      ...signal,
      timestamp: new Date(),
    }
  })),
  
  generateRandomWeatherData: () => {
    const conditions: WeatherSignal['condition'][] = ['sunny', 'cloudy', 'rainy', 'snowy'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    // 根据天气条件调整参数范围
    let tempRange = { min: 20, max: 30 };
    let humidityRange = { min: 40, max: 70 };
    
    switch (randomCondition) {
      case 'sunny':
        tempRange = { min: 25, max: 35 };
        humidityRange = { min: 30, max: 50 };
        break;
      case 'rainy':
        tempRange = { min: 15, max: 25 };
        humidityRange = { min: 70, max: 90 };
        break;
      case 'snowy':
        tempRange = { min: -5, max: 5 };
        humidityRange = { min: 60, max: 80 };
        break;
      case 'cloudy':
      default:
        tempRange = { min: 18, max: 28 };
        humidityRange = { min: 50, max: 75 };
        break;
    }
    
    const temperature = Math.round((Math.random() * (tempRange.max - tempRange.min) + tempRange.min) * 10) / 10;
    const humidity = Math.round(Math.random() * (humidityRange.max - humidityRange.min) + humidityRange.min);
    const windSpeed = Math.round((Math.random() * 8 + 1) * 10) / 10; // 1-9 m/s
    const pressure = Math.round((Math.random() * 50 + 990) * 10) / 10; // 990-1040 hPa
    
    set({
      weatherSignal: {
        temperature,
        humidity,
        windSpeed,
        pressure,
        condition: randomCondition,
        timestamp: new Date(),
      }
    });
  },
}));