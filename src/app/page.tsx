'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Point } from '@/lib/KDTree';

// Dynamically import the Map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-100 animate-pulse" />,
});

export default function Home() {
  const [points, setPoints] = useState<Point[]>([]);
  const [searchResults, setSearchResults] = useState<Array<{ point: Point; distance: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      const text = await file.text();
      const points = JSON.parse(text);

      const response = await fetch('/api/spatial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          points,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload points');
      }

      setPoints(points);
    } catch (error) {
      setError('Error uploading file: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (latlng: [number, number]) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/spatial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          targetPoint: {
            id: 'search',
            coordinates: latlng,
          },
          maxDistance: 10, // 10km radius
          maxResults: 10,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results);
    } catch (error) {
      setError('Error performing search: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">MAP-TREE</h1>
        <p className="text-gray-600">
          Upload a GeoJSON file with points to analyze spatial relationships using KD-Tree.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Upload GeoJSON
              <input
                id="file-upload"
                type="file"
                accept=".json,.geojson"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {loading && <span className="text-gray-600">Loading...</span>}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <MapComponent
              points={points}
              searchResults={searchResults}
              onSearch={handleSearch}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Search Results</h2>
              <ul className="space-y-2">
                {searchResults.map(({ point, distance }) => (
                  <li key={point.id} className="flex justify-between items-center">
                    <span>Point {point.id}</span>
                    <span className="text-gray-600">{distance.toFixed(2)} km</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
