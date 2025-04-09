import { useState } from 'react';
import { Feature, Point } from 'geojson';

interface SearchResult {
  point: Point;
  distance: number;
}

export default function SpatialSearch() {
  const [file, setFile] = useState<File | null>(null);
  const [searchPoint, setSearchPoint] = useState<Point | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setError(null);
    setLoading(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/spatial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upload',
          data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload file');
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchPoint) {
      setError('Please enter a search point');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/spatial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search',
          data: {
            targetPoint: searchPoint,
            maxDistance: 10,
            maxResults: 10,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Search failed');
      }

      setResults(result.results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Upload GeoJSON File
        </label>
        <input
          type="file"
          accept=".json,.geojson"
          onChange={handleFileUpload}
          className="mt-1 block w-full"
          disabled={loading}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Search Point (latitude, longitude)
        </label>
        <input
          type="text"
          placeholder="e.g., 40.7128, -74.0060"
          onChange={(e) => {
            const [lat, lng] = e.target.value.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              setSearchPoint({
                type: 'Point',
                coordinates: [lat, lng],
              });
            }
          }}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={loading}
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={loading || !file || !searchPoint}
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Search'}
      </button>

      {error && (
        <div className="mt-4 text-red-600">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
          <ul className="mt-2 divide-y divide-gray-200">
            {results.map((result, index) => (
              <li key={index} className="py-2">
                <div className="text-sm text-gray-900">
                  Point: [{result.point.coordinates.join(', ')}]
                </div>
                <div className="text-sm text-gray-500">
                  Distance: {result.distance.toFixed(2)} km
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 