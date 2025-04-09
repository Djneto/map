import { NextRequest, NextResponse } from 'next/server';
import { KDTree, Point } from '@/lib/KDTree';
import { Feature, Point as GeoPoint } from 'geojson';

let kdTree: KDTree | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'upload') {
      if (!data || !Array.isArray(data.features)) {
        return NextResponse.json(
          { error: 'Invalid GeoJSON data' },
          { status: 400 }
        );
      }

      const features = data.features as Feature<GeoPoint>[];
      kdTree = KDTree.fromGeoJSON(features);

      return NextResponse.json({
        success: true,
        message: `Successfully loaded ${features.length} points`,
      });
    }

    if (action === 'search') {
      if (!kdTree) {
        return NextResponse.json(
          { error: 'No data loaded. Please upload a file first.' },
          { status: 400 }
        );
      }

      const { targetPoint, maxDistance = 10, maxResults = 10 } = data;

      if (!isValidPoint(targetPoint)) {
        return NextResponse.json(
          { error: 'Invalid target point' },
          { status: 400 }
        );
      }

      const results = kdTree.findNearestNeighbors(
        targetPoint,
        maxDistance,
        maxResults
      );

      return NextResponse.json({ results });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidPoint(point: any): point is Point {
  return (
    point &&
    typeof point === 'object' &&
    Array.isArray(point.coordinates) &&
    point.coordinates.length === 2 &&
    typeof point.coordinates[0] === 'number' &&
    typeof point.coordinates[1] === 'number' &&
    point.coordinates[0] >= -90 &&
    point.coordinates[0] <= 90 &&
    point.coordinates[1] >= -180 &&
    point.coordinates[1] <= 180
  );
} 