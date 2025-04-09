import { Feature, Point as GeoPoint } from '@turf/turf';

export interface Point {
  id: string;
  coordinates: [number, number]; // [latitude, longitude]
  properties?: Record<string, any>;
}

interface KDNode {
  point: Point;
  left: KDNode | null;
  right: KDNode | null;
  axis: number;
}

export class KDTree {
  private root: KDNode | null = null;
  private dimensions = 2; // lat, lng

  constructor(points: Point[]) {
    this.root = this.buildTree(points, 0);
  }

  static fromGeoJSON(features: Feature<GeoPoint>[]): KDTree {
    const points: Point[] = features.map((feature, index) => ({
      id: feature.id?.toString() || index.toString(),
      coordinates: [
        feature.geometry.coordinates[1], // latitude
        feature.geometry.coordinates[0], // longitude
      ],
      properties: feature.properties || {},
    }));
    return new KDTree(points);
  }

  private buildTree(points: Point[], depth: number): KDNode | null {
    if (points.length === 0) return null;

    const axis = depth % this.dimensions;
    const sortedPoints = [...points].sort(
      (a, b) => a.coordinates[axis] - b.coordinates[axis]
    );

    const medianIndex = Math.floor(points.length / 2);
    const medianPoint = sortedPoints[medianIndex];

    const node: KDNode = {
      point: medianPoint,
      left: null,
      right: null,
      axis,
    };

    node.left = this.buildTree(sortedPoints.slice(0, medianIndex), depth + 1);
    node.right = this.buildTree(sortedPoints.slice(medianIndex + 1), depth + 1);

    return node;
  }

  findNearestNeighbors(
    targetPoint: Point,
    maxDistance: number,
    maxResults: number = 10
  ): { point: Point; distance: number }[] {
    const results: { point: Point; distance: number }[] = [];
    this.searchNearest(this.root, targetPoint, maxDistance, results);
    
    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);
  }

  private searchNearest(
    node: KDNode | null,
    targetPoint: Point,
    maxDistance: number,
    results: { point: Point; distance: number }[]
  ): void {
    if (!node) return;

    const distance = this.calculateDistance(targetPoint, node.point);
    if (distance <= maxDistance) {
      results.push({ point: node.point, distance });
    }

    const axisDistance = targetPoint.coordinates[node.axis] - node.point.coordinates[node.axis];

    // Search the near branch
    if (axisDistance < 0) {
      this.searchNearest(node.left, targetPoint, maxDistance, results);
      // Check if we need to search the far branch
      if (Math.abs(axisDistance) < maxDistance) {
        this.searchNearest(node.right, targetPoint, maxDistance, results);
      }
    } else {
      this.searchNearest(node.right, targetPoint, maxDistance, results);
      if (Math.abs(axisDistance) < maxDistance) {
        this.searchNearest(node.left, targetPoint, maxDistance, results);
      }
    }
  }

  private calculateDistance(point1: Point, point2: Point): number {
    const [lat1, lon1] = point1.coordinates;
    const [lat2, lon2] = point2.coordinates;
    
    // Haversine formula for calculating distances on a sphere
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  toGeoJSON(): Feature<GeoPoint>[] {
    const features: Feature<GeoPoint>[] = [];
    this.traverseTree(this.root, features);
    return features;
  }

  private traverseTree(node: KDNode | null, features: Feature<GeoPoint>[]): void {
    if (!node) return;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [node.point.coordinates[1], node.point.coordinates[0]], // [longitude, latitude]
      },
      properties: node.point.properties || {},
      id: node.point.id,
    });

    this.traverseTree(node.left, features);
    this.traverseTree(node.right, features);
  }
} 