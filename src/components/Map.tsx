'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Point } from '@/lib/KDTree';

// Fix Leaflet default marker icons
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface MapProps {
  points: Point[];
  searchResults: Array<{ point: Point; distance: number }>;
  onSearch: (latlng: [number, number]) => void;
}

export default function Map({ points, searchResults, onSearch }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const searchCircleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    fixLeafletIcons();

    if (!mapRef.current) {
      const map = L.map('map').setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onSearch([lat, lng]);

        if (searchCircleRef.current) {
          searchCircleRef.current.setLatLng([lat, lng]);
        } else {
          searchCircleRef.current = L.circle([lat, lng], {
            radius: 10000, // 10km in meters
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.1,
          }).addTo(map);
        }
      });

      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onSearch]);

  // Update markers when points change
  useEffect(() => {
    if (!markersRef.current) return;

    markersRef.current.clearLayers();

    points.forEach((point) => {
      const [lat, lng] = point.coordinates;
      L.marker([lat, lng])
        .bindPopup(`Point ${point.id}`)
        .addTo(markersRef.current!);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => p.coordinates));
      mapRef.current?.fitBounds(bounds);
    }
  }, [points]);

  // Update search result markers
  useEffect(() => {
    if (!markersRef.current) return;

    // Clear previous search result markers
    markersRef.current.clearLayers();

    // Add all points as gray markers
    points.forEach((point) => {
      const [lat, lng] = point.coordinates;
      L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'bg-gray-400 w-2 h-2 rounded-full',
          iconSize: [8, 8],
        }),
      }).addTo(markersRef.current!);
    });

    // Add search results as highlighted markers
    searchResults.forEach(({ point, distance }) => {
      const [lat, lng] = point.coordinates;
      L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'bg-blue-500 w-3 h-3 rounded-full',
          iconSize: [12, 12],
        }),
      })
        .bindPopup(`Point ${point.id}<br>Distance: ${distance.toFixed(2)} km`)
        .addTo(markersRef.current!);
    });
  }, [points, searchResults]);

  return <div id="map" className="w-full h-[600px]" />;
} 