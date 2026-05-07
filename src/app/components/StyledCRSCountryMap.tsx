import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { GeoJSONSource, LngLatBounds } from 'maplibre-gl';
import { atoMapFallbackStyle } from '../map/atoMapStyle';

type MapViewMode = 'points' | 'heatmap';
type Measure = 'commitment' | 'disbursement' | 'commitment_defl' | 'disbursement_defl';

export interface CRSCountryPoint {
  recipient: string;
  commitment: number;
  disbursement: number;
  commitment_defl: number;
  disbursement_defl: number;
  count: number;
  lat: number;
  lng: number;
  region: string;
}

const SOURCE_ID = 'crs-country-source';
const POINT_LAYER_ID = 'crs-country-points';
const HEAT_LAYER_ID = 'crs-country-heat';

function pointValue(point: CRSCountryPoint, measure: Measure) {
  if (measure === 'commitment') return point.commitment_defl ?? point.commitment;
  if (measure === 'disbursement') return point.disbursement_defl ?? point.disbursement;
  return point[measure] ?? 0;
}

function normalizeAsiaPacificLng(lng: number) {
  return lng < -25 ? lng + 360 : lng;
}

function buildFeatureCollection(points: CRSCountryPoint[], measure: Measure) {
  const values = points.map((point) => pointValue(point, measure));
  const maxValue = Math.max(...values, 1);
  return {
    type: 'FeatureCollection' as const,
    features: points.map((point) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [normalizeAsiaPacificLng(point.lng), point.lat],
      },
      properties: {
        recipient: point.recipient,
        region: point.region,
        commitment: point.commitment,
        disbursement: point.disbursement,
        commitment_defl: point.commitment_defl,
        disbursement_defl: point.disbursement_defl,
        count: point.count,
        value: pointValue(point, measure),
        radius_score: Math.max(
          0.12,
          Math.min(
            Math.sqrt(Math.max(pointValue(point, measure), 0) / maxValue),
            1,
          ),
        ),
        weight: Math.max(0.2, Math.min(Math.log10(Math.max(pointValue(point, measure), 1)) / 4, 1)),
      },
    })),
  };
}

function hideBoundaryLayers(map: maplibregl.Map) {
  const style = map.getStyle();
  style.layers?.forEach((layer) => {
    const id = layer.id.toLowerCase();
    const sourceLayer = (layer as { ['source-layer']?: string })['source-layer']?.toLowerCase() ?? '';
    if (id.includes('boundary') || id.includes('admin') || id.includes('border') || sourceLayer.includes('boundary')) {
      if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
}

export function StyledCRSCountryMap({
  points,
  viewMode = 'points',
  measure = 'commitment',
  height = 460,
  onCountrySelect,
}: {
  points: CRSCountryPoint[];
  viewMode?: MapViewMode;
  measure?: Measure;
  height?: number;
  onCountrySelect?: (country: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const featureCollection = useMemo(() => buildFeatureCollection(points, measure), [points, measure]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: JSON.parse(JSON.stringify(atoMapFallbackStyle)),
      center: [115, 13],
      zoom: 2.15,
      attributionControl: true,
    });

    const switchToFallback = () => {
      if (!map.isStyleLoaded()) {
        map.setStyle(JSON.parse(JSON.stringify(atoMapFallbackStyle)));
      }
    };

    const syncLayers = () => {
      hideBoundaryLayers(map);
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
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 14, 6, 30, 9, 46],
            'heatmap-opacity': 0.78,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(5,150,105,0)',
              0.2, '#A7F3D0',
              0.4, '#6EE7B7',
              0.6, '#10B981',
              0.8, '#059669',
              1, '#064E3B',
            ],
          },
        });
      }

      if (!map.getLayer(POINT_LAYER_ID)) {
        map.addLayer({
          id: POINT_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'radius_score'], 0.12, 4, 1, 18],
            'circle-color': '#059669',
            'circle-opacity': 0.82,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          },
        });
      }

      const isHeat = viewMode === 'heatmap';
      map.setLayoutProperty(HEAT_LAYER_ID, 'visibility', isHeat ? 'visible' : 'none');
      map.setLayoutProperty(POINT_LAYER_ID, 'visibility', isHeat ? 'none' : 'visible');

      if (featureCollection.features.length) {
        const bounds = new LngLatBounds();
        featureCollection.features.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
        map.fitBounds(bounds, { padding: 24, maxZoom: 5, duration: 600 });
      }
    };

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '280px' });

    window.setTimeout(switchToFallback, 3500);

    map.on('load', syncLayers);
    map.on('styledata', syncLayers);
    map.on('error', switchToFallback);

    map.on('mouseenter', POINT_LAYER_ID, (event) => {
      map.getCanvas().style.cursor = 'pointer';
      const feature = event.features?.[0];
      if (!feature || !popupRef.current) return;
      const props = feature.properties as any;
      popupRef.current
        .setLngLat((feature.geometry as any).coordinates.slice())
        .setHTML(`<div style="font-size:12px;line-height:1.4"><div style="font-weight:600;margin-bottom:2px">${props.recipient}</div><div>${props.region}</div><div>${measure.includes('commitment') ? 'Commitment' : 'Disbursement'}: $${Number(props.value).toFixed(0)}M, constant 2024 USD</div></div>`)
        .addTo(map);
    });

    map.on('mouseleave', POINT_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    });

    map.on('click', POINT_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const recipient = feature?.properties?.recipient;
      if (recipient) onCountrySelect?.(recipient);
    });

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [featureCollection, measure, onCountrySelect, viewMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) source.setData(featureCollection as any);
    if (map.getLayer(HEAT_LAYER_ID)) map.setLayoutProperty(HEAT_LAYER_ID, 'visibility', viewMode === 'heatmap' ? 'visible' : 'none');
    if (map.getLayer(POINT_LAYER_ID)) map.setLayoutProperty(POINT_LAYER_ID, 'visibility', viewMode === 'heatmap' ? 'none' : 'visible');
  }, [featureCollection, viewMode]);

  return <div ref={containerRef} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50" style={{ height }} />;
}
