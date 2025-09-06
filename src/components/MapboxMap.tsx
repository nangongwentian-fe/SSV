import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '../store/mapStore';
import { LayerManager } from '../lib/LayerManager';
import { AnimationEngine } from '../services/AnimationEngine';
import MapPopup from './MapPopup';
import { useCleanup } from '../hooks/useCleanup';

// 类型定义
interface LayerPopupProps {
  data: any;
  layerType: string;
  position: { x: number; y: number };
  onClose: () => void;
}

// LayerPopup 组件别名
const LayerPopup: React.FC<LayerPopupProps> = MapPopup;
import { toast } from 'sonner';
import { useLoading, LoadingWrapper } from './LoadingManager';
import { handleError, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { globalResourceManager } from '../utils/ResourceManager';

// 使用公开的Mapbox Token（免费额度）
const BUILTIN_TOKEN = 'pk.eyJ1IjoiY2hld2VpdGFvIiwiYSI6ImNsNDUzb3F4eDA3anozY3FsYzA1ZDh5eWQifQ.9Ti0_dLR6wN4WoUUvjwO_w';

// OpenStreetMap样式作为fallback
const OSM_STYLE = {
  version: 8,
  sources: {
    'osm': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm'
    }
  ]
};

interface MapboxMapProps {
  onMapReady?: (map: mapboxgl.Map) => void;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ onMapReady }) => {
  console.log('=== MapboxMap: 组件开始渲染 ===');
  console.log('MapboxMap: onMapReady prop:', typeof onMapReady);
  
  // 添加一个简单的测试日志
  useEffect(() => {
    console.log('MapboxMap: useEffect 被调用，开始地图初始化流程');
    return () => {
      console.log('MapboxMap: useEffect 清理函数被调用');
    };
  }, []);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const layerManager = useRef<LayerManager | null>(null);
  const animationEngine = useRef<AnimationEngine | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [popup, setPopup] = useState<{
    data: any;
    layerType: string;
    position: { x: number; y: number };
  } | null>(null);
  const isCleaningUpRef = useRef(false);
  console.log('MapboxMap: isCleaningUpRef 初始化为:', isCleaningUpRef.current);
  
  // 确保在组件重新挂载时重置清理状态
  useEffect(() => {
    isCleaningUpRef.current = false;
    console.log('MapboxMap: 重置 isCleaningUpRef 为 false');
  }, []);
  const { mapState } = useMapStore();
  const { mapboxToken, tilesUrl } = mapState;
  const { setLoading, isLoading } = useLoading();
  
  // 使用清理Hook
  const {
    registerEventListener,
    registerCleanup,
    performCleanup,
    getCleanupStats
  } = useCleanup('MapboxMap');
  
  // 加载状态键
  const LOADING_KEYS = {
    MAP_INIT: 'map_initialization',
    STYLE_LOAD: 'map_style_loading',
    LAYERS: 'map_layers_loading'
  };

  useEffect(() => {
    if (map.current) return; // 防止重复初始化

    const initializeMap = async () => {
      try {
        setLoading(LOADING_KEYS.MAP_INIT, true);
        
        // 等待容器元素渲染完成
        let retryCount = 0;
        const maxRetries = 10;
        
        while (!mapContainer.current && retryCount < maxRetries) {
          console.log(`MapboxMap: 等待容器元素渲染，重试 ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          retryCount++;
        }
        
        // 确保容器元素存在
        if (!mapContainer.current) {
          console.error('MapboxMap: 地图容器元素不存在，已重试', maxRetries, '次');
          setLoading(LOADING_KEYS.MAP_INIT, false);
          toast.error('地图容器初始化失败');
          return;
        }
        
        // 获取Token
        const token = mapboxToken || BUILTIN_TOKEN;
        
        mapboxgl.accessToken = token;

        // 尝试使用Mapbox样式
        let mapStyle: string | any = 'mapbox://styles/mapbox/standard';
        let useMapbox = true;

        // 测试token是否有效
        console.log('MapboxMap: 验证 Mapbox token:', token.substring(0, 20) + '...');
        try {
          const testResponse = await fetch(`https://api.mapbox.com/styles/v1/mapbox/standard?access_token=${token}`);
          console.log('MapboxMap: Token验证响应状态:', testResponse.status);
          if (!testResponse.ok) {
            throw new Error('Mapbox token invalid');
          }
          console.log('MapboxMap: Token验证成功，使用Mapbox样式');
        } catch (err) {
          console.warn('MapboxMap: Mapbox token无效，切换到OpenStreetMap:', err);
          handleError(err as Error, ErrorType.NETWORK, ErrorSeverity.MEDIUM, {
            component: 'MapboxMap',
            action: 'token_validation'
          });
          mapStyle = OSM_STYLE;
          useMapbox = false;
          toast.warning('使用OpenStreetMap作为地图服务');
        }

        // 初始化地图
        console.log('MapboxMap: 开始初始化地图');
        console.log('MapboxMap: 创建 Mapbox 地图实例');
        console.log('MapboxMap: 容器元素:', mapContainer.current);
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyle,
          center: [114.2094, 22.3193], // 启德体育园
          zoom: 14.8,
          pitch: useMapbox ? 68 : 0, // OSM不支持3D
          bearing: useMapbox ? -18 : 0,
          projection: useMapbox ? 'globe' as any : undefined,
          antialias: true
        });
        console.log('MapboxMap: 地图实例创建成功');

        // 添加控件
        map.current.addControl(new mapboxgl.NavigationControl());
        map.current.addControl(new mapboxgl.FullscreenControl());
        map.current.addControl(new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true
        }));

        // 注册事件监听器的辅助函数
        const addMapEventListener = (event: string, handler: Function) => {
          if (map.current && !isCleaningUpRef.current) {
            registerEventListener(map.current as any, event, handler as any);
          }
        };

        // 地图加载完成事件
        const styleLoadHandler = () => {
          console.log('MapboxMap: styleLoadHandler 被调用');
          if (!map.current || isCleaningUpRef.current) {
            console.error('MapboxMap: styleLoadHandler 中 map.current 为空或正在清理');
            return;
          }

          try {
            console.log('MapboxMap: 设置样式加载完成状态');
            setLoading(LOADING_KEYS.STYLE_LOAD, true);
            
            // 只有使用Mapbox时才添加3D效果
            if (useMapbox) {
              try {
                // 添加雾效
                console.log('MapboxMap: 添加雾效');
                map.current.setFog({});

                // 添加地形
                console.log('MapboxMap: 添加地形');
                map.current.addSource('mapbox-dem', {
                  type: 'raster-dem',
                  url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                  tileSize: 512
                });
                map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.0 });
              } catch (err) {
                console.warn('3D效果加载失败，继续使用2D模式:', err);
                handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.LOW, {
                  component: 'MapboxMap',
                  action: '3d_effects_loading'
                });
              }
            }

            // 初始化图层管理器和动画引擎
            console.log('MapboxMap: 准备调用 initializeManagers');
            initializeManagers();
            console.log('MapboxMap: initializeManagers 调用完成');

            // 添加地标
            addLandmarks();

            setIsLoaded(true);
            setLoading(LOADING_KEYS.STYLE_LOAD, false);
            setLoading(LOADING_KEYS.MAP_INIT, false);
            
            // 通知父组件地图已准备就绪
            if (onMapReady && map.current) {
              onMapReady(map.current);
            }

            console.log(`地图初始化完成 (${useMapbox ? 'Mapbox' : 'OpenStreetMap'})`);
            toast.success('地图加载完成');
          } catch (err) {
            console.error('地图样式加载失败:', err);
            handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
              component: 'MapboxMap',
              action: 'style_loading'
            });
            setLoading(LOADING_KEYS.STYLE_LOAD, false);
            setLoading(LOADING_KEYS.MAP_INIT, false);
            toast.error('地图样式加载失败');
          }
        };
        console.log('MapboxMap: 注册 style.load 事件监听器');
        addMapEventListener('style.load', styleLoadHandler);
        
        // 添加其他地图事件监听器用于调试
        addMapEventListener('load', () => {
          console.log('MapboxMap: load 事件被触发');
        });
        
        addMapEventListener('idle', () => {
          console.log('MapboxMap: idle 事件被触发');
        });
        
        addMapEventListener('sourcedata', (e: any) => {
          if (e.sourceDataType === 'metadata') {
            console.log('MapboxMap: sourcedata metadata 事件被触发');
          }
        });
        
        // 添加超时机制，如果10秒内样式没有加载完成，手动触发初始化
        const styleLoadTimeout = setTimeout(() => {
          console.warn('MapboxMap: 样式加载超时，手动触发初始化');
          console.log('MapboxMap: 检查条件 - map.current:', !!map.current, 'isCleaningUpRef.current:', isCleaningUpRef.current, 'isLoaded:', isLoaded);
          if (map.current && !isCleaningUpRef.current && !isLoaded) {
            console.log('MapboxMap: 开始手动初始化流程');
            try {
              // 使用统一的初始化流程，避免重复添加数据源
              console.log('MapboxMap: 调用 initializeManagers (超时回调)');
              initializeManagers();
              
              console.log('MapboxMap: 添加地标');
              addLandmarks();
              
              setIsLoaded(true);
              setLoading(LOADING_KEYS.STYLE_LOAD, false);
              setLoading(LOADING_KEYS.MAP_INIT, false);
              
              // 通知父组件地图已准备就绪
              if (onMapReady && map.current) {
                onMapReady(map.current);
              }
              
              console.log('MapboxMap: 手动初始化完成');
              toast.success('地图加载完成');
            } catch (err) {
              console.error('MapboxMap: 手动初始化失败:', err);
              setLoading(LOADING_KEYS.STYLE_LOAD, false);
              setLoading(LOADING_KEYS.MAP_INIT, false);
              toast.error('地图初始化失败');
            }
          } else {
            console.log('MapboxMap: 跳过手动初始化 - 条件不满足');
          }
        }, 10000);
        
        // 注册超时清理
        registerCleanup(() => {
          clearTimeout(styleLoadTimeout);
        });

        // 错误处理
        const errorHandler = (e: any) => {
          console.error('地图错误:', e);
          handleError(new Error(`地图错误: ${e.error?.message || '未知错误'}`), ErrorType.CLIENT, ErrorSeverity.HIGH, {
            component: 'MapboxMap',
            action: 'map_error_event'
          });
          setLoading(LOADING_KEYS.MAP_INIT, false);
          setLoading(LOADING_KEYS.STYLE_LOAD, false);
          toast.error('地图加载失败，请检查网络连接');
        };
        addMapEventListener('error', errorHandler);
        
        // 注册地图实例清理
        registerCleanup(() => {
          if (map.current) {
            try {
              map.current.remove();
            } catch (err) {
              console.warn('清理地图实例失败:', err);
            }
            map.current = null;
          }
        });

      } catch (err) {
        console.error('地图初始化失败:', err);
        handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.CRITICAL, {
          component: 'MapboxMap',
          action: 'map_initialization'
        });
        setLoading(LOADING_KEYS.MAP_INIT, false);
        setLoading(LOADING_KEYS.STYLE_LOAD, false);
        toast.error('地图初始化失败');
      }
    };

    // 使用 requestAnimationFrame 确保 DOM 已经渲染
    let timeoutId: NodeJS.Timeout | null = null;
    const rafId = requestAnimationFrame(() => {
      // 再次确保在下一个渲染周期执行
      timeoutId = setTimeout(() => {
        initializeMap();
      }, 0);
    });
    
    // 注册额外的清理逻辑
        registerCleanup(() => {
          console.log('MapboxMap: registerCleanup 回调被执行，设置 isCleaningUpRef.current = true');
          cancelAnimationFrame(rafId);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          isCleaningUpRef.current = true;
      
      try {
        console.log('开始清理MapboxMap组件资源...');
        
        // 清理弹窗
        setPopup(null);
        
        // 清理标记
        markersRef.current.forEach(marker => {
          try {
            marker.remove();
          } catch (err) {
            console.warn('清理标记失败:', err);
          }
        });
        markersRef.current = [];
        
        // 清理所有系统
        const { cleanupAllSystems } = useMapStore.getState();
        cleanupAllSystems();
        
        // 清理管理器
        if (layerManager.current) {
          try {
            layerManager.current.destroy();
          } catch (err) {
            console.warn('清理图层管理器失败:', err);
          }
          layerManager.current = null;
        }
        
        if (animationEngine.current) {
          try {
            animationEngine.current.destroy();
          } catch (err) {
            console.warn('清理动画引擎失败:', err);
          }
          animationEngine.current = null;
        }
        
        // 清理全局引用
        if ((window as any).mapboxMapRef) {
          delete (window as any).mapboxMapRef;
        }
        if ((window as any).layerManager) {
          delete (window as any).layerManager;
        }
        if ((window as any).animationEngine) {
          delete (window as any).animationEngine;
        }
        
      } catch (err) {
        console.error('组件清理过程中发生错误:', err);
        handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
          component: 'MapboxMap',
          action: 'component_cleanup'
        });
      }
    });
    
    // 在开发环境下输出清理统计
    if (process.env.NODE_ENV === 'development') {
      const cleanupStats = getCleanupStats();
      console.debug('MapboxMap清理统计:', cleanupStats);
    }
  }, [onMapReady]);

  // 初始化管理器
  const initializeManagers = () => {
    console.log('MapboxMap: initializeManagers 开始执行');
    if (!map.current) {
      console.error('MapboxMap: map.current 为空，无法初始化管理器');
      return;
    }

    try {
      setLoading(LOADING_KEYS.LAYERS, true);
      
      // 初始化图层管理器
      console.log('MapboxMap: 创建 LayerManager 实例');
      layerManager.current = new LayerManager(map.current);
      
      console.log('MapboxMap: 调用 initializeDataSources');
      layerManager.current.initializeDataSources();
      
      console.log('MapboxMap: 调用 initializeLayers');
      layerManager.current.initializeLayers();

      // 将LayerManager设置到状态管理中
      const { setLayerManager, initializeAnimationSystems, initializeScenarioSystems } = useMapStore.getState();
      setLayerManager(layerManager.current);
      
      // 初始化动画系统（这会创建AnimationEngine和相关系统）
      initializeAnimationSystems();
      
      // 获取创建的动画引擎实例
      const { animationEngine: storeAnimationEngine } = useMapStore.getState();
      animationEngine.current = storeAnimationEngine;
      
      // 初始化场景和天气系统
      initializeScenarioSystems();

      // 图层点击事件已在LayerManager内部处理
      
      setLoading(LOADING_KEYS.LAYERS, false);
    } catch (err) {
      console.error('管理器初始化失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'MapboxMap',
        action: 'managers_initialization'
      });
      setLoading(LOADING_KEYS.LAYERS, false);
      toast.error('地图功能初始化失败');
    }
  };

  // 添加地标
  const addLandmarks = () => {
    if (!map.current || isCleaningUpRef.current) return;

    // 清理现有标记
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 启德站
    const marker1 = new mapboxgl.Marker({ color: '#3B82F6' })
      .setLngLat([114.2094, 22.3193])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML('<h3>启德站</h3><p>港铁屯马线</p>')
      )
      .addTo(map.current);
    markersRef.current.push(marker1);

    // 启德体育园
    const marker2 = new mapboxgl.Marker({ color: '#10B981' })
      .setLngLat([114.2108, 22.3186])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML('<h3>启德体育园</h3><p>香港主要体育场馆</p>')
      )
      .addTo(map.current);
    markersRef.current.push(marker2);
  };

  // 获取图层管理器实例（供外部组件使用）
  const getLayerManager = () => layerManager.current;
  const getAnimationEngine = () => animationEngine.current;

  // 暴露方法给父组件（通过全局对象，因为当前组件不是forwardRef）
  // React.useImperativeHandle 在这里不适用，因为组件没有使用 forwardRef

  // 将地图实例暴露到全局，供其他组件使用
  useEffect(() => {
    if (map.current && !isCleaningUpRef.current) {
      (window as any).mapboxMapRef = {
        toggleLayer: (layerId: string, visible: boolean) => {
          if (layerManager.current && !isCleaningUpRef.current) {
            layerManager.current.toggleLayerVisibility(layerId);
          }
        },
        updateLayerData: (layerId: string, data: any) => {
          if (layerManager.current && !isCleaningUpRef.current) {
            layerManager.current.updateLayerData(layerId, data);
          }
        },
        getLayerManager: () => layerManager.current,
        getAnimationEngine: () => animationEngine.current,
        layerManager: layerManager.current,
        animationEngine: animationEngine.current,
        isDestroyed: () => isCleaningUpRef.current
      };
    }
  }, [map.current, layerManager.current, animationEngine.current]);
  
  // 同时将实例直接暴露到全局，便于性能监控
  useEffect(() => {
    if (layerManager.current && !isCleaningUpRef.current) {
      (window as any).layerManager = layerManager.current;
    }
    if (animationEngine.current && !isCleaningUpRef.current) {
      (window as any).animationEngine = animationEngine.current;
    }
    
    return () => {
      if ((window as any).layerManager) {
        delete (window as any).layerManager;
      }
      if ((window as any).animationEngine) {
        delete (window as any).animationEngine;
      }
    };
  }, [layerManager.current, animationEngine.current]);

  return (
    <div className="relative w-full h-full">
      {/* 地图容器始终渲染，不受加载状态影响 */}
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ minHeight: '400px' }}
      />
      
      {/* 地图初始化加载遮罩 */}
      {(isLoading(LOADING_KEYS.MAP_INIT) || isLoading(LOADING_KEYS.STYLE_LOAD)) && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <span className="text-lg text-gray-700">地图加载中...</span>
          </div>
        </div>
      )}
      
      {/* 图层加载指示器 */}
      {isLoading(LOADING_KEYS.LAYERS) && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-20">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-700">图层加载中...</span>
          </div>
        </div>
      )}
      
      {popup && (
        <LayerPopup
          data={popup.data}
          layerType={popup.layerType}
          position={popup.position}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
};

export default MapboxMap;