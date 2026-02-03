// Type definitions for the Campus Navigation App

export type LocationType = 'entrance' | 'building' | 'facility' | 'landmark';

export type Direction = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface CampusNode {
    id: string;
    name: string;
    qrCode: string;
    coordinates: Coordinates;
    type: LocationType;
    description?: string;
    hasEvent?: boolean;
    eventInfo?: string;
}

export interface CampusEdge {
    from: string;
    to: string;
    distance: number; // in meters
    direction: Direction;
    accessible: boolean; // wheelchair accessible
    instructions: string;
}

export interface CampusMap {
    nodes: Record<string, CampusNode>;
    edges: CampusEdge[];
}

export interface NavigationStep {
    stepNumber: number;
    instruction: string;
    distance: number;
    direction: Direction;
    fromNode: string;
    toNode: string;
    completed?: boolean;
}

export interface Route {
    id: string;
    start: string;
    end: string;
    distance: number;
    steps: NavigationStep[];
    accessible: boolean;
    estimatedTime: number; // in minutes
}

export interface NavigationState {
    currentRoute: Route | null;
    currentStepIndex: number;
    startLocation: CampusNode | null;
    destination: CampusNode | null;
    isNavigating: boolean;
    distanceTraveled: number;
}

export interface UserLocation {
    latitude: number;
    longitude: number;
    heading?: number; // compass direction in degrees
    accuracy?: number;
}

export interface VoiceSettings {
    enabled: boolean;
    pitch: number;
    rate: number;
    language: string;
}
