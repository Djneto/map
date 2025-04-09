import { NextRequest, NextResponse } from 'next/server';
import { KDTree, Point } from '@/lib/KDTree';

let kdTree: KDTree | null = null;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { action } = data;

    if (action === 'upload') {
      const { points } = data;
      if (!Array.isArray(points)) {
        return NextResponse.json(
          { error: 'Invalid points format' },
          { status: 400 }
        );
      }

      kdTree = new KDTree(points);
      return NextResponse.json({
        message: 'Points uploaded successfully',
        count: points.length,
      });
    }

    if (action === 'search') {
      if (!kdTree) {
        return NextResponse.json(
          { error: 'No data loaded. Please upload points first.' },
          { status: 400 }
        );
      }

      const { targetPoint, maxDistance, maxResults } = data;
      if (!isValidPoint(targetPoint)) {
        return NextResponse.json(
          { error: 'Invalid target point format' },
          { status: 400 }
        );
      }

      const results = kdTree.findNearestNeighbors(
        targetPoint,
        maxDistance || 10,
        maxResults || 10
      );

      return NextResponse.json({ results });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidPoint(point: any): point is Point {
  return (
    point &&
    typeof point.id === 'string' &&
    Array.isArray(point.coordinates) &&
    point.coordinates.length === 2 &&
    typeof point.coordinates[0] === 'number' &&
    typeof point.coordinates[1] === 'number'
  );
} 