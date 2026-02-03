// Data storage service for offline support

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CampusMap, VoiceSettings, CampusNode } from '../utils/types';
import { STORAGE_KEYS, DEFAULT_VOICE_SETTINGS } from '../utils/constants';
import campusMapData from '../data/campusMap.json';

/**
 * Initialize app data - load campus map into storage
 */
export async function initializeAppData(): Promise<void> {
    try {
        // Check if campus map is already stored
        const storedMap = await AsyncStorage.getItem(STORAGE_KEYS.CAMPUS_MAP);

        if (!storedMap) {
            // Store campus map for offline access
            await AsyncStorage.setItem(
                STORAGE_KEYS.CAMPUS_MAP,
                JSON.stringify(campusMapData)
            );
        }

        // Initialize voice settings if not present
        const storedVoiceSettings = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_SETTINGS);
        if (!storedVoiceSettings) {
            await AsyncStorage.setItem(
                STORAGE_KEYS.VOICE_SETTINGS,
                JSON.stringify(DEFAULT_VOICE_SETTINGS)
            );
        }
    } catch (error) {
        console.error('Error initializing app data:', error);
    }
}

/**
 * Get campus map from storage
 */
export async function getCampusMap(): Promise<CampusMap | null> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CAMPUS_MAP);
        if (data) {
            return JSON.parse(data) as CampusMap;
        }
        // Fallback to bundled data
        return campusMapData as CampusMap;
    } catch (error) {
        console.error('Error getting campus map:', error);
        return null;
    }
}

/**
 * Save voice settings
 */
export async function saveVoiceSettings(settings: VoiceSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.VOICE_SETTINGS, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving voice settings:', error);
    }
}

/**
 * Get voice settings
 */
export async function getVoiceSettings(): Promise<VoiceSettings> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_SETTINGS);
        if (data) {
            return JSON.parse(data) as VoiceSettings;
        }
    } catch (error) {
        console.error('Error getting voice settings:', error);
    }
    return DEFAULT_VOICE_SETTINGS;
}

/**
 * Save last known location
 */
export async function saveLastLocation(location: CampusNode): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(location));
    } catch (error) {
        console.error('Error saving last location:', error);
    }
}

/**
 * Get last known location
 */
export async function getLastLocation(): Promise<CampusNode | null> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
        if (data) {
            return JSON.parse(data) as CampusNode;
        }
    } catch (error) {
        console.error('Error getting last location:', error);
    }
    return null;
}

/**
 * Clear all app data
 */
export async function clearAppData(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.VOICE_SETTINGS,
            STORAGE_KEYS.LAST_LOCATION,
        ]);
    } catch (error) {
        console.error('Error clearing app data:', error);
    }
}
