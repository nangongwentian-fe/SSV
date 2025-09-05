import mapboxgl from 'mapbox-gl';
import { MapLayer, SensorData, CCTVCamera, FlowData, IAQData, BinData, FloodRiskData, PatrolData } from '../types';
import { handleError, ErrorType, ErrorSeverity } from '../utils/errorHandler';
import { globalPerformanceOptimizer } from '../utils/PerformanceOptimizer';
import { globalRenderOptimizer } from '../utils/RenderOptimizer';

export class LayerManager {
  private map: mapboxgl.Map;
  private layers: Map<string, MapLayer> = new Map();
  private dataSources: Map<string, any> = new Map();
  private popups: mapboxgl.Popup[] = [];
  private layerClickHandler?: (data: any, layerType: string, event: any) => void;
  private isDestroyed = false;
  private performanceOptimizer = globalPerformanceOptimizer;
  private performanceMonitor = {
    recordCustomMetric: (name: string, value: number) => {
      console.log(`Performance metric ${name}: ${value}ms`);
    }
  };
  private performanceStats = {
    layersLoaded: 0,
    sourcesLoaded: 0,
    lastUpdateTime: Date.now(),
    memoryUsage: 0,
    dataUpdateCount: 0,
    visibleFeatures: 0,
    culledFeatures: 0,
    renderTime: 0
  };
  private memoryCleanupTimer?: number;
  
  // 事件监听器引用
  private eventListeners = {
    moveend: () => this.performViewportCulling(),
    zoomend: () => this.performLODOptimization(),
    sourcedata: () => this.updateRenderStats()
  };
  
  // 图层事件监听器映射
  private layerEventListeners = new Map<string, {
    click: (e: mapboxgl.MapMouseEvent) => void;
    mouseenter: () => void;
    mouseleave: () => void;
  }>();
  private renderOptimization = {
    maxVisibleFeatures: 1000,
    lodLevels: {
      ultra: { zoom: 18, maxFeatures: 1000 },
      high: { zoom: 16, maxFeatures: 500 },
      medium: { zoom: 14, maxFeatures: 200 },
      low: { zoom: 12, maxFeatures: 100 },
      minimal: { zoom: 10, maxFeatures: 50 }
    },
    viewportBuffer: 0.2, // 视口缓冲区比例
    lastCullingTime: 0,
    cullingInterval: 100, // 裁剪检查间隔(ms)
    spatialIndexEnabled: true,
    adaptiveBuffering: true
  };
  private featureCache = new Map<string, { features: any[]; timestamp: number }>();
  private layerUpdateTimestamps = new Map<string, number>();
  private visibilityCache = new Map<string, boolean>();
  private renderOptimizer = globalRenderOptimizer;

  constructor(map: mapboxgl.Map) {
    this.map = map;
    this.validateMapInstance();
    this.startMemoryCleanup();
    this.setupRenderOptimization();
    
    // 注册到性能优化器
    // 初始化性能监控
    console.log('LayerManager initialized');
  }

  // 验证地图实例
  private validateMapInstance(): void {
    if (!this.map) {
      throw new Error('Map instance is required');
    }
    if (!this.map.isStyleLoaded()) {
      console.warn('Map style not fully loaded, some operations may fail');
    }
  }

  // 初始化所有数据源
  initializeDataSources(): void {
    if (this.isDestroyed) {
      console.warn('LayerManager已销毁，无法初始化数据源');
      return;
    }

    try {
      const sources = {
        'sensors-src': this.generateSensorsData(),
        'cctv-src': this.generateCCTVData(),
        'heat-src': this.generateHeatmapData(),
        'flow-src': { type: 'FeatureCollection' as const, features: [] },
      'bus-src': { type: 'FeatureCollection' as const, features: [] },
        'patrol-src': this.generatePatrolData(),
        'iaq-src': this.generateIAQData(),
        'bins-src': this.generateBinsData(),
        'flood-src': this.generateFloodData(),
        'fence-src': this.generateFenceData()
      };

      let successCount = 0;
      Object.entries(sources).forEach(([id, data]) => {
        try {
          if (!this.map.getSource(id)) {
            this.map.addSource(id, {
              type: 'geojson',
              data: data
            });
            this.dataSources.set(id, data);
            successCount++;
          }
        } catch (err) {
          console.error(`添加数据源 ${id} 失败:`, err);
          handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
            component: 'LayerManager',
            action: 'add_data_source',
            sourceId: id
          });
        }
      });

      this.performanceStats.sourcesLoaded = successCount;
      this.performanceStats.lastUpdateTime = Date.now();
      
      console.log(`数据源初始化完成: ${successCount}/${Object.keys(sources).length}`);
    } catch (err) {
      console.error('数据源初始化失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'LayerManager',
        action: 'initialize_data_sources'
      });
      throw err;
    }
  }

  // 初始化所有图层
  initializeLayers(): void {
    if (this.isDestroyed) {
      console.warn('LayerManager已销毁，无法初始化图层');
      return;
    }

    try {
      let successCount = 0;
      const layerConfigs = this.getLayerConfigurations();
      
      layerConfigs.forEach(config => {
        if (this.addLayer(config)) {
          successCount++;
        }
      });

      this.performanceStats.layersLoaded = successCount;
      this.performanceStats.lastUpdateTime = Date.now();
      
      console.log(`图层初始化完成: ${successCount}/${layerConfigs.length}`);
      
      // 添加点击事件处理
      this.setupClickHandlers();
    } catch (err) {
      console.error('图层初始化失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'LayerManager',
        action: 'initialize_layers'
      });
      throw err;
    }
  }

  // 获取所有图层配置
  private getLayerConfigurations(): any[] {
    return [
      // 1. 设备点位图层
      {
        id: 'sensors-layer',
        type: 'circle',
        source: 'sensors-src',
        layout: { 'visibility': 'visible' },
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'status'],
            '红', '#ef4444',
            '橙', '#f59e0b',
            '#22c55e'
          ],
          'circle-stroke-color': '#0b0d12',
          'circle-stroke-width': 1
        }
      },

      // 2. CCTV摄像头图层
      {
        id: 'cctv-layer',
        type: 'symbol',
        source: 'cctv-src',
        layout: {
          'visibility': 'none',
          'icon-image': 'camera-15',
          'icon-size': 1.1,
          'text-field': ['get', 'name'],
          'text-offset': [0, 1.1],
          'text-size': 11,
          'text-anchor': 'top'
        },
        paint: {
          'text-halo-color': '#0b0d12',
          'text-halo-width': 1.2,
          'text-color': '#e5e7eb'
        }
      },

      // 3. 人流热力图图层
      {
        id: 'heat-layer',
        type: 'heatmap',
        source: 'heat-src',
        layout: { 'visibility': 'none' },
        paint: {
          'heatmap-intensity': 1.1,
          'heatmap-weight': ['coalesce', ['get', 'weight'], 0.5],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 24,
            16, 42
          ],
          'heatmap-opacity': 0.85,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,255,0)',
            0.2, 'rgba(0,128,255,0.7)',
            0.4, 'rgba(0,255,255,0.8)',
            0.6, 'rgba(0,255,0,0.85)',
            0.8, 'rgba(255,255,0,0.9)',
            1, 'rgba(255,0,0,0.95)'
          ]
        }
      },
      // 4. 穿梭巴士图层
      {
        id: 'bus-layer',
        type: 'symbol',
        source: 'bus-src',
        layout: {
          'visibility': 'none',
          'icon-image': 'bus-15',
          'icon-size': 1.2,
          'icon-rotate': ['get', 'bearing'],
          'text-field': ['get', 'route'],
          'text-offset': [0, 1.5],
          'text-size': 10
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      },
      // 5. 演唱会散场人流图层
      {
        id: 'flow-layer',
        type: 'symbol',
        source: 'flow-src',
        layout: {
          'visibility': 'none',
          'icon-image': 'circle-15',
          'icon-size': 0.8,
          'icon-color': '#3b82f6'
        }
      },
      // 6. Runway 1331区域图层
      {
        id: 'fence-layer',
        type: 'fill',
        source: 'fence-src',
        layout: { 'visibility': 'none' },
        paint: {
          'fill-color': '#ff6b35',
          'fill-opacity': 0.3,
          'fill-outline-color': '#ff6b35'
        }
      },
      // 7. IAQ空气质量图层
      {
        id: 'iaq-layer',
        type: 'circle',
        source: 'iaq-src',
        layout: { 'visibility': 'none' },
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'status'],
            '红', '#ef4444',
            '橙', '#f59e0b',
            '#22c55e'
          ],
          'circle-opacity': 0.8,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      },
      // 8. 垃圾桶/清运图层
      {
        id: 'bins-layer',
        type: 'symbol',
        source: 'bins-src',
        layout: {
          'visibility': 'none',
          'icon-image': 'waste-basket-15',
          'icon-size': 1.0,
          'text-field': ['concat', ['get', 'fillLevel'], '%'],
          'text-offset': [0, 1.2],
          'text-size': 10
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      },
      // 9. 内涝/暴雨风险图层
      {
        id: 'flood-layer',
        type: 'fill',
        source: 'flood-src',
        layout: { 'visibility': 'none' },
        paint: {
          'fill-color': [
            'match',
            ['get', 'riskLevel'],
            '高', '#dc2626',
            '中', '#f59e0b',
            '#22c55e'
          ],
          'fill-opacity': 0.4
        }
      },
      // 10. 安保巡更图层
      {
        id: 'patrol-layer',
        type: 'symbol',
        source: 'patrol-src',
        layout: {
          'visibility': 'none',
          'icon-image': 'police-15',
          'icon-size': 1.1,
          'text-field': ['get', 'guardName'],
          'text-offset': [0, 1.3],
          'text-size': 10
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      }
    ];
  }

  // 添加图层
  private addLayer(layerConfig: any): boolean {
    try {
      if (!this.map.getLayer(layerConfig.id)) {
        this.map.addLayer(layerConfig);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`添加图层 ${layerConfig.id} 失败:`, err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'LayerManager',
        action: 'add_layer',
        layerId: layerConfig.id
      });
      return false;
    }
  }

  // 设置点击事件处理
  private setupClickHandlers(): void {
    const clickableLayers = [
      'sensors-layer', 'cctv-layer', 'iaq-layer', 
      'bins-layer', 'patrol-layer', 'bus-layer'
    ];

    clickableLayers.forEach(layerId => {
      // 创建并存储事件监听器
      const listeners = {
        click: (e: mapboxgl.MapMouseEvent) => this.handleLayerClick(layerId, e),
        mouseenter: () => { this.map.getCanvas().style.cursor = 'pointer'; },
        mouseleave: () => { this.map.getCanvas().style.cursor = ''; }
      };
      
      this.layerEventListeners.set(layerId, listeners);
      
      // 注册事件监听器
      this.map.on('click', layerId, listeners.click);
      this.map.on('mouseenter', layerId, listeners.mouseenter);
      this.map.on('mouseleave', layerId, listeners.mouseleave);
    });
  }

  // 处理图层点击事件
  private handleLayerClick(layerId: string, e: mapboxgl.MapMouseEvent): void {
    const feature = e.features?.[0];
    if (!feature) return;

    // 关闭之前的弹窗
    this.closeAllPopups();

    const properties = feature.properties;
    let popupContent = '';

    switch (layerId) {
      case 'sensors-layer':
        popupContent = `
          <div class="popup-content bg-gray-900 text-white p-3 rounded-lg">
            <h3 class="font-bold text-lg mb-2">${properties.type}（${properties.id}）</h3>
            <p class="mb-1">状态：<span class="status-${properties.status} px-2 py-1 rounded text-sm">${properties.status}</span></p>
            <p>数值：${properties.value}</p>
          </div>
        `;
        break;
      case 'cctv-layer':
        popupContent = `
          <div class="popup-content bg-gray-900 text-white p-3 rounded-lg">
            <h3 class="font-bold text-lg mb-2">${properties.name}</h3>
            <p class="mb-2">状态：<span class="status-${properties.status} px-2 py-1 rounded text-sm">${properties.status}</span></p>
            <img src="${properties.snapshotUrl}" width="240" height="135" style="border-radius:8px;object-fit:cover" />
          </div>
        `;
        break;
      case 'iaq-layer':
        popupContent = `
          <div class="popup-content bg-gray-900 text-white p-3 rounded-lg">
            <h3 class="font-bold text-lg mb-2">空气质量监测（${properties.id}）</h3>
            <p>PM2.5: ${properties.pm25} μg/m³</p>
            <p>PM10: ${properties.pm10} μg/m³</p>
            <p>CO2: ${properties.co2} ppm</p>
            <p>温度: ${properties.temperature}°C</p>
            <p>湿度: ${properties.humidity}%</p>
          </div>
        `;
        break;
      case 'bins-layer':
        popupContent = `
          <div class="popup-content bg-gray-900 text-white p-3 rounded-lg">
            <h3 class="font-bold text-lg mb-2">${properties.type}垃圾桶（${properties.id}）</h3>
            <p>填充度：${properties.fillLevel}%</p>
            <p>状态：<span class="status-${properties.status} px-2 py-1 rounded text-sm">${properties.status}</span></p>
            <p>上次清运：${new Date(properties.lastCollection).toLocaleString()}</p>
          </div>
        `;
        break;
      case 'patrol-layer':
        popupContent = `
          <div class="popup-content bg-gray-900 text-white p-3 rounded-lg">
            <h3 class="font-bold text-lg mb-2">安保巡更</h3>
            <p>巡更员：${properties.guardName}</p>
            <p>状态：${properties.status}</p>
            <p>进度：${Math.round(properties.progress * 100)}%</p>
          </div>
        `;
        break;
    }

    if (popupContent) {
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        className: 'custom-popup'
      })
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(this.map);

      this.popups.push(popup);
    }
  }

  // 关闭所有弹窗
  private closeAllPopups(): void {
    this.popups.forEach(popup => popup.remove());
    this.popups = [];
  }

  // 切换图层可见性
  toggleLayerVisibility(layerId: string): void {
    const visibility = this.map.getLayoutProperty(layerId, 'visibility');
    const newVisibility = visibility === 'visible' ? 'none' : 'visible';
    this.map.setLayoutProperty(layerId, 'visibility', newVisibility);
  }

  // 获取图层可见性状态
  getLayerVisibility(layerId: string): boolean {
    const visibility = this.map.getLayoutProperty(layerId, 'visibility');
    return visibility === 'visible';
  }

  // 更新图层数据
  updateLayerData(sourceId: string, data: any): void {
    if (this.isDestroyed) {
      console.warn('LayerManager已销毁，无法更新图层数据');
      return;
    }

    const startTime = performance.now();
    try {
      const source = this.map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(data);
        this.dataSources.set(sourceId, data);
        this.performanceStats.lastUpdateTime = Date.now();
        this.performanceStats.dataUpdateCount++;
        
        // 估算数据大小并更新内存使用统计
        const dataSize = this.estimateDataSize(data);
        this.performanceStats.memoryUsage += dataSize;
        
        // 记录性能指标
        const updateTime = performance.now() - startTime;
        if (updateTime > 10) { // 超过10ms的更新记录为慢操作
          this.performanceMonitor.recordCustomMetric('layerUpdateTime', updateTime);
        }
      }
    } catch (err) {
      console.error(`更新图层数据失败 ${sourceId}:`, err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.MEDIUM, {
        component: 'LayerManager',
        action: 'update_layer_data',
        sourceId
      });
    }
  }

  // 生成传感器数据
  private generateSensorsData(): GeoJSON.FeatureCollection {
    const features = [];
    const anchors = [
      [114.19733435248456, 22.322347899895064], // KTSP
      [114.2128, 22.3074] // Runway 1331
    ];

    for (let i = 0; i < 72; i++) {
      const anchor = anchors[i % 2];
      features.push({
        type: 'Feature' as const,
        properties: {
          id: `S${1000 + i}`,
          type: ['电表', '水表', '烟感', '门禁'][i % 4],
          status: i % 13 === 0 ? '红' : (i % 7 === 0 ? '橙' : '绿'),
          value: Math.round(Math.random() * 89 + 10),
          lastUpdate: new Date().toISOString()
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [
            anchor[0] + (Math.random() - 0.5) * 0.008,
            anchor[1] + (Math.random() - 0.5) * 0.008
          ]
        }
      });
    }

    return { type: 'FeatureCollection' as const, features };
  }

  // 生成CCTV数据
  private generateCCTVData(): GeoJSON.FeatureCollection {
    const locations = [
      [114.19733435248456, 22.322347899895064], // KTSP
      [114.2027, 22.3293], // Mall 2 Taxi
      [114.1994, 22.3304], // Kai Tak Station
      [114.2128, 22.3074] // Runway 1331
    ];

    const features = locations.map((location, index) => ({
      type: 'Feature' as const,
      properties: {
        id: `CCTV${index + 1}`,
        name: `CCTV #${index + 1}`,
        status: ['红', '橙', '绿'][index % 3],
        snapshotUrl: `https://placehold.co/320x180/1f2937/ffffff?text=CCTV+${index + 1}`,
        isRecording: Math.random() > 0.2
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [
          location[0] + (Math.random() - 0.5) * 0.003,
          location[1] + (Math.random() - 0.5) * 0.003
        ]
      }
    }));

    return { type: 'FeatureCollection' as const, features };
  }

  // 生成热力图数据
  private generateHeatmapData(): GeoJSON.FeatureCollection {
    const features = [];
    const hotspots = [
      [114.19733435248456, 22.322347899895064], // KTSP
      [114.2027, 22.3293], // Mall 2 Taxi
      [114.1994, 22.3304] // Kai Tak Station
    ];

    hotspots.forEach(hotspot => {
      for (let i = 0; i < 50; i++) {
        features.push({
          type: 'Feature' as const,
          properties: {
            weight: Math.random() * 0.8 + 0.2
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [
              hotspot[0] + (Math.random() - 0.5) * 0.006,
              hotspot[1] + (Math.random() - 0.5) * 0.006
            ]
          }
        });
      }
    });

    return { type: 'FeatureCollection' as const, features };
  }

  // 生成IAQ数据
  private generateIAQData(): GeoJSON.FeatureCollection {
    const locations = [
      [114.19733435248456, 22.322347899895064],
      [114.2027, 22.3293],
      [114.1994, 22.3304],
      [114.2128, 22.3074]
    ];

    const features = locations.map((location, index) => {
      const pm25 = Math.round(Math.random() * 50 + 10);
      const status = pm25 > 35 ? '红' : (pm25 > 25 ? '橙' : '绿');
      
      return {
        type: 'Feature' as const,
        properties: {
          id: `IAQ${index + 1}`,
          pm25,
          pm10: Math.round(pm25 * 1.5),
          co2: Math.round(Math.random() * 200 + 400),
          temperature: Math.round(Math.random() * 10 + 20),
          humidity: Math.round(Math.random() * 30 + 50),
          status
        },
        geometry: {
          type: 'Point' as const,
          coordinates: location
        }
      };
    });

    return { type: 'FeatureCollection' as const, features };
  }

  // 生成垃圾桶数据
  private generateBinsData(): GeoJSON.FeatureCollection {
    const features = [];
    const types = ['一般垃圾', '回收', '厨余'];
    
    for (let i = 0; i < 15; i++) {
      const fillLevel = Math.round(Math.random() * 100);
      const status = fillLevel > 80 ? '红' : (fillLevel > 60 ? '橙' : '绿');
      
      features.push({
        type: 'Feature' as const,
        properties: {
          id: `BIN${i + 1}`,
          type: types[i % 3],
          fillLevel,
          status,
          lastCollection: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [
            114.19733435248456 + (Math.random() - 0.5) * 0.01,
            22.322347899895064 + (Math.random() - 0.5) * 0.01
          ]
        }
      });
    }

    return { type: 'FeatureCollection' as const, features };
  }

  // 生成内涝风险数据
  private generateFloodData(): GeoJSON.FeatureCollection {
    const riskAreas = [
      {
        coordinates: [[
          [114.1960, 22.3200],
          [114.1980, 22.3200],
          [114.1980, 22.3220],
          [114.1960, 22.3220],
          [114.1960, 22.3200]
        ]],
        riskLevel: '中'
      },
      {
        coordinates: [[
          [114.2020, 22.3280],
          [114.2040, 22.3280],
          [114.2040, 22.3300],
          [114.2020, 22.3300],
          [114.2020, 22.3280]
        ]],
        riskLevel: '低'
      }
    ];

    const features = riskAreas.map((area, index) => ({
      type: 'Feature' as const,
      properties: {
        id: `FLOOD${index + 1}`,
        riskLevel: area.riskLevel,
        waterLevel: Math.round(Math.random() * 50),
        status: area.riskLevel === '高' ? '红' : (area.riskLevel === '中' ? '橙' : '绿')
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: area.coordinates
      }
    }));

    return { type: 'FeatureCollection' as const, features };
  }

  // 生成围栏数据
  private generateFenceData(): GeoJSON.FeatureCollection {
    const runwayArea = {
      coordinates: [[
        [114.2100, 22.3070],
        [114.2150, 22.3070],
        [114.2150, 22.3200],
        [114.2100, 22.3200],
        [114.2100, 22.3070]
      ]]
    };

    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: {
          id: 'RUNWAY1331',
          name: 'Runway 1331 区域',
          type: '管制区域'
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: runwayArea.coordinates
        }
      }]
    };
  }

  // 生成巡更数据
  private generatePatrolData(): GeoJSON.FeatureCollection {
    const guards = [
      {
        name: '张三',
        route: [
          [114.1970, 22.3210],
          [114.1990, 22.3230],
          [114.2010, 22.3250]
        ]
      },
      {
        name: '李四',
        route: [
          [114.2020, 22.3280],
          [114.2040, 22.3290],
          [114.2060, 22.3300]
        ]
      }
    ];

    const features = guards.map((guard, index) => {
      const progress = Math.random();
      const routeIndex = Math.floor(progress * (guard.route.length - 1));
      const currentPosition = guard.route[routeIndex];
      
      return {
        type: 'Feature' as const,
        properties: {
          id: `GUARD${index + 1}`,
          guardName: guard.name,
          progress,
          status: ['巡逻中', '休息'][Math.floor(Math.random() * 2)]
        },
        geometry: {
          type: 'Point' as const,
          coordinates: currentPosition
        }
      };
    });

    return { type: 'FeatureCollection' as const, features };
  }

  // 获取所有图层信息
  getAllLayers(): { id: string; name: string; visible: boolean }[] {
    return [
      { id: 'sensors-layer', name: '设备点位', visible: this.getLayerVisibility('sensors-layer') },
      { id: 'cctv-layer', name: 'CCTV摄像头', visible: this.getLayerVisibility('cctv-layer') },
      { id: 'heat-layer', name: '人流热力图', visible: this.getLayerVisibility('heat-layer') },
      { id: 'bus-layer', name: '穿梭巴士', visible: this.getLayerVisibility('bus-layer') },
      { id: 'flow-layer', name: '演唱会散场人流', visible: this.getLayerVisibility('flow-layer') },
      { id: 'fence-layer', name: 'Runway 1331区域', visible: this.getLayerVisibility('fence-layer') },
      { id: 'iaq-layer', name: 'IAQ空气质量', visible: this.getLayerVisibility('iaq-layer') },
      { id: 'bins-layer', name: '垃圾桶/清运', visible: this.getLayerVisibility('bins-layer') },
      { id: 'flood-layer', name: '内涝/暴雨风险', visible: this.getLayerVisibility('flood-layer') },
      { id: 'patrol-layer', name: '安保巡更', visible: this.getLayerVisibility('patrol-layer') }
    ];
  }

  // 启动内存清理定时器
  private startMemoryCleanup(): void {
    // 每5分钟清理一次内存统计
    this.memoryCleanupTimer = window.setInterval(() => {
      this.cleanupMemoryStats();
    }, 5 * 60 * 1000);
  }

  // 设置渲染优化
  private setupRenderOptimization(): void {
    // 监听地图移动和缩放事件
    this.map.on('moveend', this.eventListeners.moveend);
    this.map.on('zoomend', this.eventListeners.zoomend);
    this.map.on('sourcedata', this.eventListeners.sourcedata);
  }

  // 执行视口裁剪
  private performViewportCulling(): void {
    const now = Date.now();
    if (now - this.renderOptimization.lastCullingTime < this.renderOptimization.cullingInterval) {
      return;
    }

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();
    
    // 转换边界格式
    const boundsObj = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    let totalVisible = 0;
    let totalCulled = 0;

    // 使用新的RenderOptimizer对每个数据源进行优化
    this.dataSources.forEach((data, sourceId) => {
      if (data.features) {
        const optimizationResult = this.renderOptimizer.optimizeFeatures(
          data.features,
          zoom,
          boundsObj
        );
        
        // 更新优化后的数据
        const optimizedData = {
          ...data,
          features: optimizationResult.optimizedFeatures
        };
        
        // 使用渲染队列更新数据源
        this.renderOptimizer.queueRender(() => {
          try {
            const source = this.map.getSource(sourceId) as mapboxgl.GeoJSONSource;
            if (source && source.setData) {
              source.setData(optimizedData);
            }
          } catch (err) {
            console.warn(`更新数据源 ${sourceId} 失败:`, err);
          }
        });
        
        totalVisible += optimizationResult.stats.optimized;
        totalCulled += optimizationResult.stats.culled;
        
        // 更新可见性缓存
        this.visibilityCache.set(sourceId, optimizationResult.stats.optimized > 0);
      }
    });

    this.performanceStats.visibleFeatures = totalVisible;
    this.performanceStats.culledFeatures = totalCulled;
    this.renderOptimization.lastCullingTime = now;
  }

  // 根据视口裁剪要素（优化版）
  private cullFeaturesByViewport(features: any[], bounds: any): { visible: number; culled: number } {
    let visible = 0;
    let culled = 0;

    // 计算自适应缓冲区
    const zoom = this.map.getZoom();
    const adaptiveBuffer = this.renderOptimization.adaptiveBuffering 
      ? this.calculateAdaptiveBuffer(zoom)
      : this.renderOptimization.viewportBuffer;

    // 扩展边界
    const extendedBounds = {
      north: bounds.north + (bounds.north - bounds.south) * adaptiveBuffer,
      south: bounds.south - (bounds.north - bounds.south) * adaptiveBuffer,
      east: bounds.east + (bounds.east - bounds.west) * adaptiveBuffer,
      west: bounds.west - (bounds.east - bounds.west) * adaptiveBuffer
    };

    // 批量处理要素以提高性能
    const batchSize = 100;
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize);
      
      batch.forEach(feature => {
        if (this.isFeatureInViewport(feature, extendedBounds)) {
          visible++;
        } else {
          culled++;
        }
      });
    }

    return { visible, culled };
  }

  // 计算自适应缓冲区
  private calculateAdaptiveBuffer(zoom: number): number {
    // 根据缩放级别动态调整缓冲区大小
    if (zoom >= 16) return 0.1; // 高缩放级别，小缓冲区
    if (zoom >= 14) return 0.2; // 中等缩放级别，中等缓冲区
    if (zoom >= 12) return 0.3; // 低缩放级别，大缓冲区
    return 0.4; // 很低缩放级别，很大缓冲区
  }

  // 优化的要素可见性检查
  private isFeatureInViewport(feature: any, bounds: any): boolean {
    if (!feature.geometry || !feature.geometry.coordinates) {
      return false;
    }

    const coords = feature.geometry.coordinates;
    const { west, east, south, north } = bounds;

    switch (feature.geometry.type) {
      case 'Point':
        const [lng, lat] = coords;
        return lng >= west && lng <= east && lat >= south && lat <= north;
      
      case 'LineString':
        // 检查线段是否与视口相交
        return this.lineIntersectsViewport(coords, bounds);
      
      case 'Polygon':
        // 检查多边形是否与视口相交
        return this.polygonIntersectsViewport(coords[0], bounds);
      
      case 'MultiPoint':
        return coords.some(([lng, lat]: [number, number]) => 
          lng >= west && lng <= east && lat >= south && lat <= north
        );
      
      default:
        return true; // 未知类型默认可见
    }
  }

  // 检查线段是否与视口相交
  private lineIntersectsViewport(coords: number[][], bounds: any): boolean {
    const { west, east, south, north } = bounds;
    
    // 快速边界框检查
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    
    return !(maxLng < west || minLng > east || maxLat < south || minLat > north);
  }

  // 检查多边形是否与视口相交
  private polygonIntersectsViewport(coords: number[][], bounds: any): boolean {
    const { west, east, south, north } = bounds;
    
    // 快速边界框检查
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    
    return !(maxLng < west || minLng > east || maxLat < south || minLat > north);
  }

  // 执行LOD优化（增强版）
  private performLODOptimization(): void {
    const zoom = this.map.getZoom();
    const bounds = this.map.getBounds();
    const currentTime = Date.now();
    
    // 智能LOD级别选择
    const lodLevel = this.selectOptimalLODLevel(zoom);
    const config = this.renderOptimization.lodLevels[lodLevel];
    
    // 获取性能指标用于自适应调整
    const performanceMetrics = this.getPerformanceMetrics();
    const adaptiveMaxFeatures = this.calculateAdaptiveMaxFeatures(
      config.maxFeatures, 
      performanceMetrics
    );
    
    // 转换边界格式
    const boundsObj = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
    
    // 对每个数据源执行LOD优化
    this.dataSources.forEach((data, sourceId) => {
      if (data.features) {
        // 检查缓存
        const cacheKey = `${sourceId}_${lodLevel}_${zoom.toFixed(1)}`;
        let optimizedFeatures = this.getFromCache(cacheKey);
        
        if (!optimizedFeatures) {
          // 执行优化
          const optimizationResult = this.renderOptimizer.optimizeFeatures(
            data.features,
            zoom,
            boundsObj
          );
          
          optimizedFeatures = optimizationResult.optimizedFeatures;
          
          // 缓存结果
          this.cacheOptimizedFeatures(cacheKey, optimizedFeatures);
        }
        
        // 更新数据源（仅在有变化时）
        if (this.shouldUpdateLayerData(sourceId, optimizedFeatures)) {
          this.updateLayerDataSource(sourceId, optimizedFeatures);
        }
      }
    });

    // 根据缩放级别调整图层样式
    this.adjustLayerStylesByZoom(zoom);
    
    // 清理过期缓存
    this.cleanupExpiredCache(currentTime);
  }
  
  // 智能LOD级别选择
  private selectOptimalLODLevel(zoom: number): string {
    if (zoom >= 18) return 'ultra';
    if (zoom >= 16) return 'high';
    if (zoom >= 14) return 'medium';
    if (zoom >= 12) return 'low';
    return 'minimal';
  }
  
  // 获取性能指标
  private getPerformanceMetrics() {
    return {
      fps: this.renderOptimizer.getAverageFPS(),
      memoryUsage: this.renderOptimizer.getMemoryUsage(),
      renderTime: this.renderOptimizer.getAverageRenderTime()
    };
  }
  
  // 计算自适应最大要素数
  private calculateAdaptiveMaxFeatures(baseMaxFeatures: number, metrics: any): number {
    let multiplier = 1.0;
    
    // 根据FPS调整
    if (metrics.fps < 30) {
      multiplier *= 0.7; // 降低要素数
    } else if (metrics.fps > 55) {
      multiplier *= 1.3; // 增加要素数
    }
    
    // 根据内存使用调整
    if (metrics.memoryUsage > 0.8) {
      multiplier *= 0.8;
    }
    
    // 根据渲染时间调整
    if (metrics.renderTime > 16) { // 超过16ms（60fps阈值）
      multiplier *= 0.9;
    }
    
    return Math.max(50, Math.floor(baseMaxFeatures * multiplier));
  }
  
  // 从缓存获取
  private getFromCache(cacheKey: string): any[] | null {
    const cached = this.featureCache.get(cacheKey);
    if (cached && cached.timestamp && Date.now() - cached.timestamp < 5000) {
      return cached.features;
    }
    return null;
  }
  
  // 缓存优化后的要素
  private cacheOptimizedFeatures(cacheKey: string, features: any[]): void {
    this.featureCache.set(cacheKey, {
      features,
      timestamp: Date.now()
    });
    
    // 限制缓存大小
    if (this.featureCache.size > 50) {
      const oldestKey = this.featureCache.keys().next().value;
      this.featureCache.delete(oldestKey);
    }
  }
  
  // 检查是否需要更新图层数据
  private shouldUpdateLayerData(sourceId: string, newFeatures: any[]): boolean {
    const lastUpdate = this.layerUpdateTimestamps?.get(sourceId) || 0;
    const now = Date.now();
    
    // 至少间隔100ms才更新
    return now - lastUpdate > 100;
  }
  
  // 更新数据源
  private updateLayerDataSource(sourceId: string, features: any[]): void {
    try {
      const source = this.map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (source && source.setData) {
        source.setData({
          type: 'FeatureCollection' as const,
          features
        });
        
        if (!this.layerUpdateTimestamps) {
          this.layerUpdateTimestamps = new Map();
        }
        this.layerUpdateTimestamps.set(sourceId, Date.now());
      }
    } catch (err) {
      console.warn(`LOD优化更新数据源 ${sourceId} 失败:`, err);
    }
  }
  
  // 清理过期缓存
  private cleanupExpiredCache(currentTime: number): void {
    for (const [key, value] of this.featureCache.entries()) {
      if (value.timestamp && currentTime - value.timestamp > 10000) {
        this.featureCache.delete(key);
      }
    }
  }

  // 采样要素
  private sampleFeatures(features: any[], maxCount: number): any[] {
    if (features.length <= maxCount) {
      return features;
    }

    const step = features.length / maxCount;
    const sampled = [];
    
    for (let i = 0; i < features.length; i += step) {
      sampled.push(features[Math.floor(i)]);
      if (sampled.length >= maxCount) break;
    }
    
    return sampled;
  }

  // 根据缩放级别调整图层样式
  private adjustLayerStylesByZoom(zoom: number): void {
    try {
      // 调整点图层大小
      if (this.map.getLayer('sensors-layer')) {
        const radius = zoom < 14 ? 4 : zoom < 16 ? 6 : 8;
        this.map.setPaintProperty('sensors-layer', 'circle-radius', radius);
      }

      // 调整文本大小
      const textSize = zoom < 14 ? 9 : zoom < 16 ? 11 : 13;
      ['cctv-layer', 'patrol-layer', 'bins-layer'].forEach(layerId => {
        if (this.map.getLayer(layerId)) {
          this.map.setLayoutProperty(layerId, 'text-size', textSize);
        }
      });

      // 调整热力图强度
      if (this.map.getLayer('heat-layer')) {
        const intensity = zoom < 14 ? 0.8 : zoom < 16 ? 1.1 : 1.4;
        this.map.setPaintProperty('heat-layer', 'heatmap-intensity', intensity);
      }
    } catch (err) {
      console.warn('调整图层样式失败:', err);
    }
  }

  // 更新渲染统计
  private updateRenderStats(): void {
    const now = Date.now();
    this.performanceStats.lastUpdateTime = now;
    this.performanceStats.dataUpdateCount++;
    
    // 估算内存使用
    let totalMemory = 0;
    this.dataSources.forEach(data => {
      totalMemory += this.estimateDataSize(data);
    });
    this.performanceStats.memoryUsage = totalMemory;
    
    // 性能指标更新日志
    console.debug('LayerManager 性能指标:', {
      renderTime: this.performanceStats.renderTime,
      visibleFeatures: this.performanceStats.visibleFeatures,
      culledFeatures: this.performanceStats.culledFeatures,
      memoryUsage: totalMemory
    });
  }

  // 清理内存统计
  private cleanupMemoryStats(): void {
    const beforeMemory = this.performanceStats.memoryUsage;
    
    // 重置累积的内存使用统计
    this.performanceStats.memoryUsage = 0;
    this.performanceStats.dataUpdateCount = 0;
    this.performanceStats.visibleFeatures = 0;
    this.performanceStats.culledFeatures = 0;
    this.performanceStats.renderTime = 0;
    
    // 清理缓存
    this.featureCache.clear();
    this.visibilityCache.clear();
    
    // 内存清理性能指标日志
    console.debug('LayerManager 内存清理指标:', {
      memoryUsage: beforeMemory,
      cleanupOperations: this.featureCache.size + this.visibilityCache.size
    });
    
    console.log('LayerManager内存统计已清理，释放内存:', beforeMemory, '字节');
  }

  // 估算数据大小（字节）
  private estimateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // 粗略估算，每个字符2字节
    } catch {
      return 0;
    }
  }

  // 销毁管理器
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    try {
      // 清理内存清理定时器
      if (this.memoryCleanupTimer) {
        clearInterval(this.memoryCleanupTimer);
        this.memoryCleanupTimer = undefined;
      }
      
      // 移除所有事件监听器
      this.removeAllEventListeners();
      
      // 关闭所有弹窗
      this.closeAllPopups();
      
      // 清理数据
      this.layers.clear();
      this.dataSources.clear();
      this.featureCache.clear();
      this.visibilityCache.clear();
      
      // 清理性能统计
      this.performanceStats = {
        layersLoaded: 0,
        sourcesLoaded: 0,
        lastUpdateTime: 0,
        memoryUsage: 0,
        dataUpdateCount: 0,
        visibleFeatures: 0,
        culledFeatures: 0,
        renderTime: 0
      };
      
      // 从性能优化器注销
      // 清理性能监控
    console.log('LayerManager destroyed');
      
      this.isDestroyed = true;
      console.log('LayerManager已销毁');
    } catch (err) {
      console.error('LayerManager销毁失败:', err);
      handleError(err as Error, ErrorType.CLIENT, ErrorSeverity.HIGH, {
        component: 'LayerManager',
        action: 'destroy'
      });
    }
  }

  // 移除所有事件监听器
  private removeAllEventListeners(): void {
    const clickableLayers = [
      'sensors-layer', 'cctv-layer', 'iaq-layer', 
      'bins-layer', 'patrol-layer', 'bus-layer'
    ];

    clickableLayers.forEach(layerId => {
      try {
        const listeners = this.layerEventListeners.get(layerId);
        if (listeners) {
          this.map.off('click', layerId, listeners.click);
          this.map.off('mouseenter', layerId, listeners.mouseenter);
          this.map.off('mouseleave', layerId, listeners.mouseleave);
          this.layerEventListeners.delete(layerId);
        }
      } catch (err) {
        console.warn(`移除图层 ${layerId} 事件监听器失败:`, err);
      }
    });

    // 移除渲染优化相关的事件监听器
    try {
      this.map.off('moveend', this.eventListeners.moveend);
      this.map.off('zoomend', this.eventListeners.zoomend);
      this.map.off('sourcedata', this.eventListeners.sourcedata);
    } catch (err) {
      console.warn('移除渲染优化事件监听器失败:', err);
    }
  }

  // 获取性能统计信息
  getPerformanceStats(): typeof this.performanceStats {
    return { ...this.performanceStats };
  }

  // 获取渲染优化统计
  getRenderOptimizationStats(): {
    maxVisibleFeatures: number;
    currentLOD: string;
    viewportBuffer: number;
    lastCullingTime: number;
  } {
    const zoom = this.map.getZoom();
    const { lodLevels } = this.renderOptimization;
    
    let currentLOD = 'low';
    if (zoom >= lodLevels.high.zoom) {
      currentLOD = 'high';
    } else if (zoom >= lodLevels.medium.zoom) {
      currentLOD = 'medium';
    }

    return {
      maxVisibleFeatures: this.renderOptimization.maxVisibleFeatures,
      currentLOD,
      viewportBuffer: this.renderOptimization.viewportBuffer,
      lastCullingTime: this.renderOptimization.lastCullingTime
    };
  }

  // 动态调整渲染优化参数
  updateRenderOptimization(params: {
    maxVisibleFeatures?: number;
    viewportBuffer?: number;
    cullingInterval?: number;
  }): void {
    if (params.maxVisibleFeatures !== undefined) {
      this.renderOptimization.maxVisibleFeatures = params.maxVisibleFeatures;
    }
    if (params.viewportBuffer !== undefined) {
      this.renderOptimization.viewportBuffer = params.viewportBuffer;
    }
    if (params.cullingInterval !== undefined) {
      this.renderOptimization.cullingInterval = params.cullingInterval;
    }
    
    console.log('渲染优化参数已更新:', params);
  }

  // 检查LayerManager是否已销毁
  getIsDestroyed(): boolean {
    return this.isDestroyed;
  }
}