// App-wide constants

import { Direction, LocationType } from './types';

// Distance threshold for step completion (in meters)
export const STEP_COMPLETION_THRESHOLD = 5;

// Average walking speed (meters per minute)
export const AVERAGE_WALKING_SPEED = 80;

// Location update interval (milliseconds)
export const LOCATION_UPDATE_INTERVAL = 2000;

// Voice guidance settings
export const DEFAULT_VOICE_SETTINGS = {
    enabled: true,
    pitch: 1.0,
    rate: 0.9,
    language: 'en-US',
};

// Direction to degree mapping (for compass)
export const DIRECTION_DEGREES: Record<Direction, number> = {
    north: 0,
    northeast: 45,
    east: 90,
    southeast: 135,
    south: 180,
    southwest: 225,
    west: 270,
    northwest: 315,
};

// Direction tolerance for wrong-direction detection (degrees)
export const DIRECTION_TOLERANCE = 45; // +/-45 degrees from expected direction

// Minimum speed to validate direction (meters per second)
// Below this speed, we assume user is stationary and don't check direction
export const MIN_SPEED_FOR_DIRECTION_CHECK = 0.3; // ~1 km/h

// Direction display names
export const DIRECTION_NAMES: Record<Direction, string> = {
    north: 'North',
    south: 'South',
    east: 'East',
    west: 'West',
    northeast: 'Northeast',
    northwest: 'Northwest',
    southeast: 'Southeast',
    southwest: 'Southwest',
};

// Location type icons (Ionicons names)
export const LOCATION_ICONS: Record<LocationType, string> = {
    entrance: 'log-in-outline',
    building: 'business-outline',
    facility: 'grid-outline',
    landmark: 'location-outline',
};

// Color scheme
export const COLORS = {
    primary: '#2563eb', // Blue
    secondary: '#7c3aed', // Purple
    success: '#10b981', // Green
    warning: '#f59e0b', // Orange
    danger: '#ef4444', // Red
    background: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    accessible: '#059669', // Green for accessible routes
};

// QR Code prefixes
export const QR_CODE_PREFIX = 'CAMPUS_';

// Storage keys
export const STORAGE_KEYS = {
    CAMPUS_MAP: '@campus_map',
    ROUTES: '@routes',
    VOICE_SETTINGS: '@voice_settings',
    LAST_LOCATION: '@last_location',
};
