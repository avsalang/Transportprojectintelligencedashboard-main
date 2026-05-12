import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { GeoJSONSource, LngLatBounds, MapStyleDataEvent } from 'maplibre-gl';
import { Project, MDB_COLORS } from '../data/mockData';
import { ATO_STYLE_URL, atoMapFallbackStyle } from '../map/atoMapStyle';
import { canCreateWebGLContext } from '../utils/webgl';

type MapViewMode = 'points' | 'heatmap';

const SOURCE_ID = 'projects-source';
const POINT_LAYER_ID = 'projects-points';
const POINT_GLOW_LAYER_ID = 'projects-points-glow';
const HEAT_LAYER_ID = 'projects-heat';

function buildFeatureCollection(projects: Project[]) {
  return {
    type: 'FeatureCollection' as const,
    features: projects
      .filter((project) => project.has_coordinates && project.latitude !== null && project.longitude !== null)
      .map((project) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [project.longitude as number, project.latitude as number],
        },
        properties: {
          id: project.id,
          project_name: project.project_name,
          funding_source: project.funding_source,
          country: project.country,
          mode: project.transport_mode_category,
          low_precision: project.low_precision ? 1 : 0,
          amount: project.amount ?? 0,
          color: MDB_COLORS[project.funding_source],
          weight: Math.max(0.2, Math.min(Math.log10(Math.max(project.amount ?? 1, 1)) / 10, 1)),
        },
      })),
  };
}

function applyBorderLightMode(map: maplibregl.Map) {
  const style = map.getStyle();
  style.layers?.forEach((layer) => {
    const id = layer.id.toLowerCase();
    const sourceLayer = (layer as { ['source-layer']?: string })['source-layer']?.toLowerCase() ?? '';
    const looksLikeBoundary =
      id.includes('boundary') ||
      id.includes('admin') ||
      id.includes('border') ||
      sourceLayer.includes('boundary');

    if (!looksLikeBoundary) return;

    if (map.getLayer(layer.id)) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
}

function ensureProjectLayers(
  map: maplibregl.Map,
  featureCollection: ReturnType<typeof buildFeatureCollection>,
  viewMode: MapViewMode
) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: featureCollection as any,
    });
  } else {
    (map.getSource(SOURCE_ID) as GeoJSONSource).setData(featureCollection as any);
  }

  if (!map.getLayer(HEAT_LAYER_ID)) {
    map.addLayer({
      id: HEAT_LAYER_ID,
      type: 'heatmap',
      source: SOURCE_ID,
      maxzoom: 9,
      paint: {
        'heatmap-weight': ['coalesce', ['get', 'weight'], 0.25],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 6, 1.8],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 12, 6, 28, 9, 42],
        'heatmap-opacity': 0.78,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(59,130,246,0)',
          0.2,
          '#93C5FD',
          0.4,
          '#60A5FA',
          0.6,
          '#2563EB',
          0.8,
          '#1D4ED8',
          1,
          '#0F172A',
        ],
      },
    });
  }

  if (!map.getLayer(POINT_GLOW_LAYER_ID)) {
    map.addLayer({
      id: POINT_GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['case', ['==', ['get', 'low_precision'], 1], 10, 0],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.15,
        'circle-stroke-width': 0,
      },
    });
  }

  if (!map.getLayer(POINT_LAYER_ID)) {
    map.addLayer({
      id: POINT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['case', ['==', ['get', 'low_precision'], 1], 6, 4.5],
        'circle-color': ['get', 'color'],
        'circle-opacity': ['case', ['==', ['get', 'low_precision'], 1], 0.58, 0.84],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
      },
    });
  }

  const isHeatmap = viewMode === 'heatmap';
  map.setLayoutProperty(HEAT_LAYER_ID, 'visibility', isHeatmap ? 'visible' : 'none');
  map.setLayoutProperty(POINT_LAYER_ID, 'visibility', isHeatmap ? 'none' : 'visible');
  map.setLayoutProperty(POINT_GLOW_LAYER_ID, 'visibility', isHeatmap ? 'none' : 'visible');
}

function fitToProjects(map: maplibregl.Map, featureCollection: ReturnType<typeof buildFeatureCollection>) {
  if (!featureCollection.features.length) return;

  const bounds = new LngLatBounds();
  featureCollection.features.forEach((feature) => {
    bounds.extend(feature.geometry.coordinates as [number, number]);
  });
  map.fitBounds(bounds, { padding: 24, maxZoom: 7, duration: 600 });
}

function WebGLFallback({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 text-center" style={{ height }}>
      <div className="max-w-md">
        <p className="text-base font-semibold text-slate-800">Interactive map unavailable</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This browser session could not create a WebGL context. The surrounding charts and rankings still show the same filtered project data.
        </p>
      </div>
    </div>
  );
}

export function StyledProjectMap({
  projects,
  viewMode = 'points',
  height = 420,
  onProjectSelect,
}: {
  projects: Project[];
  viewMode?: MapViewMode;
  height?: number;
  onProjectSelect?: (project: Project) => void;
}) {
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hasBoundInteractionsRef = useRef(false);
  const hasFitBoundsRef = useRef(false);
  const usingFallbackStyleRef = useRef(false);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const projectLookupRef = useRef<Map<string, Project>>(new Map());
  const onProjectSelectRef = useRef<typeof onProjectSelect>(onProjectSelect);

  const projectLookup = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const featureCollection = useMemo(() => buildFeatureCollection(projects), [projects]);

  useEffect(() => {
    projectLookupRef.current = projectLookup;
    onProjectSelectRef.current = onProjectSelect;
  }, [onProjectSelect, projectLookup]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || mapUnavailable) return;
    if (!canCreateWebGLContext()) {
      setMapUnavailable(true);
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: ATO_STYLE_URL,
        center: [95, 18],
        zoom: 2,
        attributionControl: true,
      });
    } catch {
      setMapUnavailable(true);
      return;
    }
    let isRemoved = false;

    const removeMap = () => {
      if (isRemoved) return;
      isRemoved = true;
      if (fallbackTimeoutRef.current !== null) {
        window.clearTimeout(fallbackTimeoutRef.current);
      }
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      hasBoundInteractionsRef.current = false;
    };

    const switchToFallbackStyle = () => {
      if (usingFallbackStyleRef.current) return;
      usingFallbackStyleRef.current = true;
      map.setStyle(JSON.parse(JSON.stringify(atoMapFallbackStyle)));
    };

    const syncMap = () => {
      applyBorderLightMode(map);
      ensureProjectLayers(map, featureCollection, viewMode);
      if (!hasFitBoundsRef.current && featureCollection.features.length) {
        fitToProjects(map, featureCollection);
        hasFitBoundsRef.current = true;
      }
    };

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      maxWidth: '280px',
    });

    fallbackTimeoutRef.current = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
        switchToFallbackStyle();
      }
    }, 3500);

    map.on('load', syncMap);
    map.on('styledata', (event: MapStyleDataEvent) => {
      if (event.dataType === 'style') {
        syncMap();
      }
    });
    map.on('error', (event) => {
      const error = (event as { error?: unknown }).error as { message?: string; type?: string } | undefined;
      if (error?.type === 'webglcontextcreationerror' || error?.message?.toLowerCase().includes('webgl')) {
        setMapUnavailable(true);
        removeMap();
        return;
      }
      if (!map.isStyleLoaded()) {
        switchToFallbackStyle();
      }
    });

    if (!hasBoundInteractionsRef.current) {
      map.on('mouseenter', POINT_LAYER_ID, (event) => {
        map.getCanvas().style.cursor = 'pointer';
        const feature = event.features?.[0];
        if (!feature || !popupRef.current) return;
        const coordinates = (feature.geometry as any).coordinates.slice();
        const props = feature.properties as any;
        popupRef.current
          .setLngLat(coordinates)
          .setHTML(
            `<div style="font-size:12px;line-height:1.4">
              <div style="font-weight:600;margin-bottom:2px">${props.project_name}</div>
              <div>${props.mode} · ${props.country}</div>
            </div>`
          )
          .addTo(map);
      });

      map.on('mouseleave', POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
        popupRef.current?.remove();
      });

      map.on('click', POINT_LAYER_ID, (event) => {
        const feature = event.features?.[0];
        const projectId = feature?.properties?.id;
        if (!projectId) return;
        const project = projectLookupRef.current.get(projectId);
        if (project) onProjectSelectRef.current?.(project);
      });

      hasBoundInteractionsRef.current = true;
    }

    return removeMap;
  }, [featureCollection, mapUnavailable, viewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    ensureProjectLayers(map, featureCollection, viewMode);
    if (featureCollection.features.length) {
      fitToProjects(map, featureCollection);
    }
  }, [featureCollection, viewMode]);

  if (mapUnavailable) return <WebGLFallback height={height} />;

  return <div ref={containerRef} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50" style={{ height }} />;
}
