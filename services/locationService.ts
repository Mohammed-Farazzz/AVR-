// Location tracking service using GPS

import * as Location from 'expo-location';
import { UserLocation } from '../utils/types';
import { LOCATION_UPDATE_INTERVAL } from '../utils/constants';

/**
 * Request location permission
 * @returns Permission status
 */
export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
}

/**
 * Check if location permission is granted
 * @returns Permission status
 */
export async function hasLocationPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
}

/**
 * Get current user location
 * @returns Current location with coordinates and heading
 */
export async function getCurrentLocation(): Promise<UserLocation | null> {
    try {
        const hasPermission = await hasLocationPermission();
        if (!hasPermission) {
            const granted = await requestLocationPermission();
            if (!granted) return null;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        // Get heading (compass direction)
        let heading: number | undefined;
        try {
            const headingData = await Location.getHeadingAsync();
            heading = headingData.trueHeading;
        } catch (error) {
            console.log('Heading not available:', error);
        }

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading,
            accuracy: location.coords.accuracy || undefined,
        };
    } catch (error) {
        console.error('Error getting location:', error);
        return null;
    }
}

/**
 * Start watching user location with callback
 * @param callback - Function to call with location updates
 * @returns Subscription object to stop watching
 */
export async function watchLocation(
    callback: (location: UserLocation) => void
): Promise<Location.LocationSubscription | null> {
    try {
        const hasPermission = await hasLocationPermission();
        if (!hasPermission) {
            const granted = await requestLocationPermission();
            if (!granted) return null;
        }

        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: LOCATION_UPDATE_INTERVAL,
                distanceInterval: 1, // Update every 1 meter
            },
            (location) => {
                callback({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    accuracy: location.coords.accuracy || undefined,
                });
            }
        );

        return subscription;
    } catch (error) {
        console.error('Error watching location:', error);
        return null;
    }
}

/**
 * Stop watching location
 * @param subscription - Subscription object from watchLocation
 */
export function stopWatchingLocation(
    subscription: Location.LocationSubscription | null
): void {
    if (subscription) {
        subscription.remove();
    }
}
