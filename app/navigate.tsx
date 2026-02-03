// Active Navigation Screen

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Route, CampusNode } from '../utils/types';
import { getCampusMap } from '../services/storageService';
import { getNavigationEngine } from '../services/navigationService';
import { watchLocation, stopWatchingLocation } from '../services/locationService';
import { setVoiceSettings, getVoiceSettings } from '../services/voiceService';
import StepCard from '../components/StepCard';
import NavigationHeader from '../components/NavigationHeader';
import { COLORS } from '../utils/constants';
import type { LocationSubscription } from 'expo-location';

export default function NavigateScreen() {
    const router = useRouter();
    const { routeData, startLocationId, destinationId } = useLocalSearchParams<{
        routeData: string;
        startLocationId: string;
        destinationId: string;
    }>();

    const [route, setRoute] = useState<Route | null>(null);
    const [startLocation, setStartLocation] = useState<CampusNode | null>(null);
    const [destination, setDestination] = useState<CampusNode | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [remainingDistance, setRemainingDistance] = useState(0);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [campusNodes, setCampusNodes] = useState<Record<string, CampusNode>>({});
    const [isWrongDirection, setIsWrongDirection] = useState(false);

    const locationSubscription = useRef<LocationSubscription | null>(null);
    const navigationEngine = useRef(getNavigationEngine());

    useEffect(() => {
        initializeNavigation();
        return () => {
            // Cleanup
            if (locationSubscription.current) {
                stopWatchingLocation(locationSubscription.current);
            }
            navigationEngine.current.stopNavigation();
        };
    }, []);

    const initializeNavigation = async () => {
        // Parse route data
        const parsedRoute: Route = JSON.parse(routeData);
        setRoute(parsedRoute);

        // Get campus map
        const campusMap = await getCampusMap();
        if (!campusMap) return;

        setCampusNodes(campusMap.nodes);
        const start = campusMap.nodes[startLocationId];
        const dest = campusMap.nodes[destinationId];

        setStartLocation(start);
        setDestination(dest);

        // Initialize navigation engine
        navigationEngine.current.startNavigation(parsedRoute, start, dest);

        // Load voice settings
        const voiceSettings = await getVoiceSettings();
        setVoiceEnabled(voiceSettings.enabled);
        setVoiceSettings(voiceSettings);

        // Start location tracking
        const subscription = await watchLocation((location) => {
            navigationEngine.current.updateLocation(location, campusMap.nodes);
            updateNavigationState();
        });
        locationSubscription.current = subscription;

        // Initial state update
        updateNavigationState();
    };

    const updateNavigationState = () => {
        const state = navigationEngine.current.getState();
        const currentStep = navigationEngine.current.getCurrentStep();

        if (currentStep) {
            setCurrentStepIndex(currentStep.stepNumber - 1);
        }

        setProgress(navigationEngine.current.getProgress());
        setRemainingDistance(navigationEngine.current.getRemainingDistance());
        setIsWrongDirection(navigationEngine.current.isHeadingWrongDirection());

        // Check if navigation is complete
        if (!state.isNavigating && route) {
            handleNavigationComplete();
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

    const handleCancel = () => {
        Alert.alert(
            'Cancel Navigation',
            'Are you sure you want to stop navigation?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes',
                    style: 'destructive',
                    onPress: () => {
                        navigationEngine.current.stopNavigation();
                        router.push('/');
                    },
                },
            ]
        );
    };

    const handleNextStep = () => {
        navigationEngine.current.nextStep();
        updateNavigationState();
    };

    const toggleVoice = async () => {
        const newVoiceEnabled = !voiceEnabled;
        setVoiceEnabled(newVoiceEnabled);

        const voiceSettings = await getVoiceSettings();
        setVoiceSettings({ ...voiceSettings, enabled: newVoiceEnabled });
    };

    if (!route || !startLocation || !destination) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading navigation...</Text>
            </View>
        );
    }

    const currentStep = route.steps[currentStepIndex];

    return (
        <View style={styles.container}>
            {/* Header */}
            <NavigationHeader
                currentLocation={startLocation.name}
                destination={destination.name}
                onCancel={handleCancel}
            />

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{remainingDistance.toFixed(0)}m</Text>
                    <Text style={styles.statLabel}>Remaining</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {currentStepIndex + 1}/{route.steps.length}
                    </Text>
                    <Text style={styles.statLabel}>Steps</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{route.estimatedTime} min</Text>
                    <Text style={styles.statLabel}>Est. Time</Text>
                </View>
            </View>

            {/* Wrong Direction Warning */}
            {isWrongDirection && (
                <View style={styles.warningBanner}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <View style={styles.warningContent}>
                        <Text style={styles.warningTitle}>Wrong Direction!</Text>
                        <Text style={styles.warningText}>
                            Please turn around to face the correct direction
                        </Text>
                    </View>
                </View>
            )}

            {/* Steps list */}
            <ScrollView style={styles.stepsContainer} contentContainerStyle={styles.stepsContent}>
                {route.steps.map((step, index) => (
                    <StepCard
                        key={index}
                        step={step}
                        totalSteps={route.steps.length}
                        isActive={index === currentStepIndex}
                    />
                ))}
            </ScrollView>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.controlButton, styles.voiceButton]}
                    onPress={toggleVoice}
                >
                    <Text style={styles.controlButtonText}>
                        {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.controlButton, styles.nextButton]}
                    onPress={handleNextStep}
                    disabled={currentStepIndex >= route.steps.length - 1}
                >
                    <Text style={styles.controlButtonText}>Next Step →</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    progressBar: {
        height: 8,
        backgroundColor: COLORS.border,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.success,
    },
    progressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 20,
        justifyContent: 'space-around',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    stepsContainer: {
        flex: 1,
    },
    stepsContent: {
        paddingVertical: 8,
    },
    controls: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    controlButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    voiceButton: {
        backgroundColor: COLORS.secondary,
    },
    nextButton: {
        backgroundColor: COLORS.primary,
    },
    controlButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    warningBanner: {
        backgroundColor: '#fef2f2',
        borderLeftWidth: 4,
        borderLeftColor: COLORS.danger,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    warningIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.danger,
        marginBottom: 4,
    },
    warningText: {
        fontSize: 14,
        color: '#991b1b',
    },
});
