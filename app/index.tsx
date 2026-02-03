// Home Screen - QR Code Scanner

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { CampusNode } from '../utils/types';
import { requestCameraPermission, processQRCode } from '../services/qrService';
import { getCampusMap, saveLastLocation } from '../services/storageService';
import { COLORS } from '../utils/constants';

export default function HomeScreen() {
    const router = useRouter();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [scannedLocation, setScannedLocation] = useState<CampusNode | null>(null);

    useEffect(() => {
        (async () => {
            const granted = await requestCameraPermission();
            setHasPermission(granted);
        })();
    }, []);

    const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
        setScanned(true);

        // Get campus map
        const campusMap = await getCampusMap();
        if (!campusMap) {
            Alert.alert('Error', 'Failed to load campus map');
            setScanned(false);
            return;
        }

        // Process QR code
        const location = processQRCode(data, campusMap);

        if (location) {
            setScannedLocation(location);
            await saveLastLocation(location);

            // Navigate to destination selection after 1 second
            setTimeout(() => {
                router.push({
                    pathname: '/destinations',
                    params: { startLocationId: location.id },
                });
            }, 1000);
        } else {
            Alert.alert(
                'Invalid QR Code',
                'This QR code is not recognized as a campus location. Please scan a valid campus QR code.',
                [{ text: 'OK', onPress: () => setScanned(false) }]
            );
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>
                    Camera permission is required to scan QR codes
                </Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={async () => {
                        const granted = await requestCameraPermission();
                        setHasPermission(granted);
                    }}
                >
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Campus Navigator</Text>
                <Text style={styles.subtitle}>Scan a QR code to get started</Text>
            </View>

            {/* Camera View */}
            <View style={styles.cameraContainer}>
                <CameraView
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Scanning frame */}
                <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>

                {scannedLocation && (
                    <View style={styles.successOverlay}>
                        <Ionicons name="checkmark-circle" size={64} color="#fff" style={{ marginBottom: 16 }} />
                        <Text style={styles.successText}>Location Found!</Text>
                        <Text style={styles.locationName}>{scannedLocation.name}</Text>
                    </View>
                )}
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
                <View style={styles.instructionRow}>
                    <Ionicons name="location" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={styles.instructionText}>
                        Position the QR code within the frame
                    </Text>
                </View>
                <View style={styles.instructionRow}>
                    <Ionicons name="navigate-circle" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={styles.instructionText}>
                        Available locations: Main Gate, Admin Block, Library, Computer Lab
                    </Text>
                </View>
            </View>

            {/* Rescan button */}
            {scanned && !scannedLocation && (
                <TouchableOpacity
                    style={styles.rescanButton}
                    onPress={() => setScanned(false)}
                >
                    <Text style={styles.rescanText}>Tap to Scan Again</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: COLORS.primary,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    cameraContainer: {
        flex: 1,
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    scanFrame: {
        position: 'absolute',
        top: '25%',
        left: '12.5%',
        width: '75%',
        height: '50%',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#fff',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    successOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 185, 129, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    locationName: {
        fontSize: 18,
        color: '#fff',
    },
    instructions: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        flex: 1,
    },
    rescanButton: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 25,
    },
    rescanText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    message: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 25,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
