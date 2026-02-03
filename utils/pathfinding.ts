// Pathfinding utilities using Dijkstra's algorithm

import { CampusMap, CampusNode, CampusEdge, Route, NavigationStep } from './types';
import { AVERAGE_WALKING_SPEED } from './constants';

/**
 * Find the shortest path between two nodes using Dijkstra's algorithm
 * @param campusMap - The campus map with nodes and edges
 * @param startId - Starting node ID
 * @param endId - Destination node ID
 * @param requireAccessible - Whether to only use accessible paths
 * @returns Route object with step-by-step instructions
 */
export function findRoute(
    campusMap: CampusMap,
    startId: string,
    endId: string,
    requireAccessible: boolean = false
): Route | null {
    // Validate nodes exist
    if (!campusMap.nodes[startId] || !campusMap.nodes[endId]) {
        return null;
    }

    // Build adjacency list
    const adjacency: Record<string, Array<{ node: string; edge: CampusEdge }>> = {};

    for (const edge of campusMap.edges) {
        // Skip inaccessible edges if accessibility is required
        if (requireAccessible && !edge.accessible) {
            continue;
        }

        if (!adjacency[edge.from]) {
            adjacency[edge.from] = [];
        }
        adjacency[edge.from].push({ node: edge.to, edge });
    }

    // Dijkstra's algorithm
    const distances: Record<string, number> = {};
    const previous: Record<string, { nodeId: string; edge: CampusEdge } | null> = {};
    const unvisited = new Set<string>();

    // Initialize
    for (const nodeId in campusMap.nodes) {
        distances[nodeId] = Infinity;
        previous[nodeId] = null;
        unvisited.add(nodeId);
    }
    distances[startId] = 0;

    while (unvisited.size > 0) {
        // Find node with minimum distance
        let currentNode: string | null = null;
        let minDistance = Infinity;

        for (const nodeId of unvisited) {
            if (distances[nodeId] < minDistance) {
                minDistance = distances[nodeId];
                currentNode = nodeId;
            }
        }

        if (currentNode === null || distances[currentNode] === Infinity) {
            break; // No path exists
        }

        unvisited.delete(currentNode);

        // Found destination
        if (currentNode === endId) {
            break;
        }

        // Update neighbors
        const neighbors = adjacency[currentNode] || [];
        for (const { node: neighborId, edge } of neighbors) {
            if (!unvisited.has(neighborId)) continue;

            const altDistance = distances[currentNode] + edge.distance;
            if (altDistance < distances[neighborId]) {
                distances[neighborId] = altDistance;
                previous[neighborId] = { nodeId: currentNode, edge };
            }
        }
    }

    // No path found
    if (distances[endId] === Infinity) {
        return null;
    }

    // Reconstruct path
    const path: Array<{ nodeId: string; edge: CampusEdge | null }> = [];
    let current: string | null = endId;

    while (current !== null) {
        const prev = previous[current];
        path.unshift({ nodeId: current, edge: prev?.edge || null });
        current = prev?.nodeId || null;
    }

    // Build navigation steps
    const steps: NavigationStep[] = [];
    let stepNumber = 1;

    for (let i = 1; i < path.length; i++) {
        const edge = path[i].edge;
        if (edge) {
            steps.push({
                stepNumber,
                instruction: edge.instructions,
                distance: edge.distance,
                direction: edge.direction,
                fromNode: edge.from,
                toNode: edge.to,
                completed: false,
            });
            stepNumber++;
        }
    }

    // Calculate estimated time
    const totalDistance = distances[endId];
    const estimatedTime = Math.ceil(totalDistance / AVERAGE_WALKING_SPEED);

    return {
        id: `${startId}_to_${endId}`,
        start: startId,
        end: endId,
        distance: totalDistance,
        steps,
        accessible: requireAccessible,
        estimatedTime,
    };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Get all available destinations from a starting point
 * @param campusMap - The campus map
 * @param startId - Starting node ID
 * @param requireAccessible - Whether to filter for accessible routes only
 * @returns Array of destination nodes with distances
 */
export function getAvailableDestinations(
    campusMap: CampusMap,
    startId: string,
    requireAccessible: boolean = false
): Array<{ node: CampusNode; distance: number }> {
    const destinations: Array<{ node: CampusNode; distance: number }> = [];

    for (const nodeId in campusMap.nodes) {
        if (nodeId === startId) continue;

        const route = findRoute(campusMap, startId, nodeId, requireAccessible);
        if (route) {
            destinations.push({
                node: campusMap.nodes[nodeId],
                distance: route.distance,
            });
        }
    }

    // Sort by distance
    destinations.sort((a, b) => a.distance - b.distance);

    return destinations;
}

/**
 * Normalize angle to 0-360 range
 * @param angle - Angle in degrees
 * @returns Normalized angle
 */
function normalizeAngle(angle: number): number {
    let normalized = angle % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
}

/**
 * Calculate the smallest difference between two angles
 * @param angle1 - First angle in degrees
 * @param angle2 - Second angle in degrees
 * @returns Smallest angular difference (0-180)
 */
export function getAngleDifference(angle1: number, angle2: number): number {
    const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2));
    return diff > 180 ? 360 - diff : diff;
}

/**
 * Check if user is moving in the correct direction
 * @param userHeading - Current device heading in degrees (0-360)
 * @param expectedDirection - Expected direction from route
 * @param tolerance - Acceptable deviation in degrees
 * @returns True if user is heading in the right direction
 */
export function isCorrectDirection(
    userHeading: number,
    expectedDirection: number,
    tolerance: number = 45
): boolean {
    const difference = getAngleDifference(userHeading, expectedDirection);
    return difference <= tolerance;
}
