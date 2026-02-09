// App-wide constants

import { Direction, LocationType } from './types';

// Distance threshold for step completion (in meters)
export const STEP_COMPLETION_THRESHOLD = 5;

// Average walking speed (meters per minute)
export const AVERAGE_WALKING_SPEED = 80;

// Location update interval (milliseconds)
export const LOCATION_UPDATE_INTERVAL = 2000;

// AR movement detection
export const AR_STEP_ACCEL_THRESHOLD = 0.18; // G units (approx)
export const AR_STEP_MIN_DURATION_MS = 3000;
export const AR_HEADING_DEVIATION_DEGREES = 20;
export const AR_ONBOARDING_SEEN_KEY = '@ar_onboarding_seen';

// AR perceptual guidance
export const AR_WRONG_DIRECTION_DEGREES = 45;
export const AR_WRONG_DIRECTION_MIN_MS = 3000;
export const AR_ARROW_AHEAD_METERS_MIN = 1.4;
export const AR_ARROW_AHEAD_METERS_MAX = 1.8;
export const AR_ARROW_CORRIDOR_COUNT = 1; // render 1–3 (default single)
export const AR_ARROW_CORRIDOR_SPACING = 0.5; // meters
export const AR_ARROW_FLOOR_Y = -1.1; // virtual floor plane (camera-relative)
export const AR_ARROW_FLOOR_OFFSET_Y = 0.07;
export const AR_PARALLAX_METERS = 0.06; // ~5–10px perceptual shift
export const AR_HEADING_PRECISION_DEGREES = 6;
export const AR_HEADING_DEADZONE_DEGREES = 1.5;

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

export const LOCATION_ICON_OVERRIDES: Record<string, string> = {
    canteen: 'fast-food-outline',
    playground: 'football-outline',
};

// Color scheme
export const COLORS = {
    primary: '#007AFF', // Action Blue
    secondary: '#5856D6', // Indigo
    success: '#34C759', // Apple Green
    warning: '#FF9F0A', // Orange
    danger: '#FF3B30', // Apple Red
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    border: 'transparent',
    accessible: '#34C759',
};

export const RADII = {
    card: 20,
    button: 20,
    pill: 999,
};

export const SHADOWS = {
    soft: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
};

export const SPACING = {
    cardPadding: 20,
    cardMarginHorizontal: 16,
    cardMarginVertical: 10,
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
