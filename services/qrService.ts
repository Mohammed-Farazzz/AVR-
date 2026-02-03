// QR Code scanning service

import { Camera } from 'expo-camera';
import { CampusMap, CampusNode } from '../utils/types';
import { QR_CODE_PREFIX } from '../utils/constants';

/**
 * Request camera permission for QR code scanning
 * @returns Permission status
 */
export async function requestCameraPermission(): Promise<boolean> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
}

/**
 * Validate and process scanned QR code
 * @param data - Scanned QR code data
 * @param campusMap - Campus map to validate against
 * @returns Matched campus node or null if invalid
 */
export function processQRCode(
    data: string,
    campusMap: CampusMap
): CampusNode | null {
    // Validate QR code format
    if (!data.startsWith(QR_CODE_PREFIX)) {
        return null;
    }

    // Find matching node
    for (const nodeId in campusMap.nodes) {
        const node = campusMap.nodes[nodeId];
        if (node.qrCode === data) {
            return node;
        }
    }

    return null;
}

/**
 * Check if camera permission is granted
 * @returns Permission status
 */
export async function hasCameraPermission(): Promise<boolean> {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status === 'granted';
}
