// AR Guide Screen - Camera-based navigation with directional overlay

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Route, CampusNode } from '../utils/types';
import { getCampusMap } from '../services/storageService';
import { getNavigationEngine } from '../services/navigationService';
import { setVoiceSettings, getVoiceSettings } from '../services/voiceService';
import { COLORS, DIRECTION_DEGREES } from '../utils/constants';

const { width, height } = Dimensions.get('window');

export default function ARGuideScreen() {
    const router = useRouter();
    const { routeData, startLocationId, destinationId, currentStepIndex: initialStepIndex } = useLocalSearchParams<{
        routeData: string;
        startLocationId: string;
        destinationId: string;
        currentStepIndex?: string;
    }>();

    const [permission, requestPermission] = useCameraPermissions();
    const [route, setRoute] = useState<Route | null>(null);
    const [destination, setDestination] = useState<CampusNode | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(parseInt(initialStepIndex || '0'));
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [remainingDistance, setRemainingDistance] = useState(0);

    const arrowRotation = useRef(new Animated.Value(0)).current;
    const navigationEngine = useRef(getNavigationEngine());

    useEffect(() => {
        initializeNavigation();
        return () => {
            navigationEngine.current.stopNavigation();
        };
    }, []);

    useEffect(() => {
        if (route && currentStepIndex < route.steps.length) {
            const currentStep = route.steps[currentStepIndex];
            animateArrowToDirection(currentStep.direction);
            updateRemainingDistance();
        }
    }, [currentStepIndex, route]);

    const initializeNavigation = async () => {
        const parsedRoute: Route = JSON.parse(routeData);
        setRoute(parsedRoute);

        const campusMap = await getCampusMap();
        if (!campusMap) return;

        const dest = campusMap.nodes[destinationId];
        setDestination(dest);

        // Load voice settings
        const voiceSettings = await getVoiceSettings();
        setVoiceEnabled(voiceSettings.enabled);
        setVoiceSettings(voiceSettings);

        updateRemainingDistance();
    };

    const updateRemainingDistance = () => {
        if (!route) return;
        const remaining = route.steps
            .slice(currentStepIndex)
            .reduce((sum, step) => sum + step.distance, 0);
        setRemainingDistance(remaining);
    };

    const animateArrowToDirection = (direction: string) => {
        const targetDegrees = DIRECTION_DEGREES[direction as keyof typeof DIRECTION_DEGREES] || 0;

        Animated.spring(arrowRotation, {
            toValue: targetDegrees,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    };

    const handleNextStep = () => {
        if (!route) return;

        if (currentStepIndex >= route.steps.length - 1) {
            handleNavigationComplete();
        } else {
            setCurrentStepIndex(currentStepIndex + 1);
        }
    };

    const handleNavigationComplete = () => {
        Alert.alert(
            'Navigation Complete',
            `You have arrived at ${destination?.name}!`,
            [
                {
                    text: 'OK',
                    onPress: () => router.push('/'),
                },
            ]
        );
    };

    const handleBackToList = () => {
        router.push({
            pathname: '/navigate',
            params: {
                routeData,
                startLocationId,
                destinationId,
            },
        });
    };

    const toggleVoice = async () => {
        const newVoiceEnabled = !voiceEnabled;
        setVoiceEnabled(newVoiceEnabled);

        const voiceSettings = await getVoiceSettings();
        setVoiceSettings({ ...voiceSettings, enabled: newVoiceEnabled });
    };

    // Handle camera permissions
    if (!permission) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <View style={styles.permissionCard}>
                    <Text style={styles.permissionTitle}>Camera Access Required</Text>
                    <Text style={styles.permissionText}>
                        AR navigation needs camera access to overlay directions on your real-world view.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
                        <Text style={styles.backButtonText}>Back to List View</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!route || !destination) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading navigation...</Text>
            </View>
        );
    }

    const currentStep = route.steps[currentStepIndex];
    const progress = ((currentStepIndex + 1) / route.steps.length) * 100;

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <CameraView style={styles.camera} facing="back" />

            {/* Top Overlay - Destination Info */}
            <View style={styles.topOverlay}>
                <View style={styles.glassCard}>
                    <Text style={styles.destinationText}>{destination.name}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.stepsText}>
                        Step {currentStepIndex + 1} of {route.steps.length}
                    </Text>
                </View>
            </View>

            {/* Center - Directional Arrow */}
            <View style={styles.arrowContainer}>
                <Animated.View
                    style={[
                        styles.arrowWrapper,
                        {
                            transform: [
                                {
                                    rotate: arrowRotation.interpolate({
                                        inputRange: [0, 360],
                                        outputRange: ['0deg', '360deg'],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.arrow}>
                        <View style={styles.arrowHead} />
                        <View style={styles.arrowBody} />
                    </View>
                </Animated.View>
            </View>

            {/* Instruction Card */}
            <View style={styles.instructionContainer}>
                <View style={styles.instructionCard}>
                    <Text style={styles.instructionText}>{currentStep.instruction}</Text>
                    <Text style={styles.distanceText}>{currentStep.distance}m</Text>
                </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomOverlay}>
                <View style={styles.controlsContainer}>
                    {/* Back to List */}
                    <TouchableOpacity style={styles.controlButton} onPress={handleBackToList}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="list" size={24} color="#fff" />
                        </View>
                        <Text style={styles.controlLabel}>List</Text>
                    </TouchableOpacity>

                    {/* Voice Toggle */}
                    <TouchableOpacity style={styles.controlButton} onPress={toggleVoice}>
                        <View style={styles.iconCircle}>
                            <Ionicons
                                name={voiceEnabled ? "volume-high" : "volume-mute"}
                                size={24}
                                color="#fff"
                            />
                        </View>
                        <Text style={styles.controlLabel}>Voice</Text>
                    </TouchableOpacity>

                    {/* Next Step */}
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleNextStep}
                        disabled={currentStepIndex >= route.steps.length - 1}
                    >
                        <View style={[
                            styles.iconCircle,
                            styles.primaryIconCircle,
                            currentStepIndex >= route.steps.length - 1 && styles.disabledIconCircle
                        ]}>
                            <Ionicons name="arrow-forward" size={24} color="#fff" />
                        </View>
                        <Text style={styles.controlLabel}>Next</Text>
                    </TouchableOpacity>
                </View>

                {/* Remaining Distance */}
                <View style={styles.distanceContainer}>
                    <Text style={styles.remainingText}>{remainingDistance}m remaining</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 24,
    },
    permissionCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        maxWidth: 400,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 12,
        width: '100%',
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    backButton: {
        paddingVertical: 12,
    },
    backButtonText: {
        color: COLORS.primary,
        fontSize: 16,
        fontWeight: '500',
    },
    topOverlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    destinationText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    stepsText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    arrowContainer: {
        position: 'absolute',
        top: height * 0.35,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowWrapper: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrow: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowHead: {
        width: 0,
        height: 0,
        borderLeftWidth: 30,
        borderRightWidth: 30,
        borderBottomWidth: 40,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    arrowBody: {
        width: 24,
        height: 60,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    instructionContainer: {
        position: 'absolute',
        bottom: 180,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    instructionCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 400,
        width: '100%',
    },
    instructionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
        flex: 1,
        marginRight: 12,
    },
    distanceText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingBottom: 40,
        paddingTop: 20,
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 40,
        marginBottom: 16,
    },
    controlButton: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    primaryIconCircle: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    disabledIconCircle: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    controlLabel: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    distanceContainer: {
        alignItems: 'center',
    },
    remainingText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
});
