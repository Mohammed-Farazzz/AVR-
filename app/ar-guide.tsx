// AR Guide Screen - Camera-based navigation with directional overlay

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    AppState,
    AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Route, CampusNode } from '../utils/types';
import { getCampusMap } from '../services/storageService';
import { getNavigationEngine } from '../services/navigationService';
import { setVoiceSettings, getVoiceSettings, setAppActive, resetVoiceSettings, stopSpeaking, speakNavigationStep } from '../services/voiceService';
import { COLORS, DIRECTION_DEGREES, RADII, SHADOWS, AR_STEP_ACCEL_THRESHOLD, AR_STEP_MIN_DURATION_MS } from '../utils/constants';

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
    const [showArrival, setShowArrival] = useState(false);
    const [showStepPrompt, setShowStepPrompt] = useState(false);

    const navigationEngine = useRef(getNavigationEngine());
    const glContextRef = useRef<any>(null);
    const rendererRef = useRef<Renderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const arrowRef = useRef<THREE.Group | null>(null);
    const animationRef = useRef<number | null>(null);
    const headingRef = useRef<number>(0);
    const anchorHeadingRef = useRef<number | null>(null);
    const targetBearingRef = useRef<number>(0);
    const arrowRotationRef = useRef<number>(0);
    const magnetometerSub = useRef<any>(null);
    const accelerometerSub = useRef<any>(null);
    const gravityRef = useRef({ x: 0, y: 0, z: 0 });
    const movementMsRef = useRef(0);
    const lastAccelTsRef = useRef<number | null>(null);
    const routeRef = useRef<Route | null>(null);
    const currentStepIndexRef = useRef(currentStepIndex);
    const showArrivalRef = useRef(false);
    const showStepPromptRef = useRef(false);
    const voiceEnabledRef = useRef(true);

    useEffect(() => {
        initializeNavigation();
        return () => {
            navigationEngine.current.stopNavigation();
            if (magnetometerSub.current) {
                magnetometerSub.current.remove();
                magnetometerSub.current = null;
            }
            if (accelerometerSub.current) {
                accelerometerSub.current.remove();
                accelerometerSub.current = null;
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const handleAppStateChange = (state: AppStateStatus) => {
            setAppActive(state === 'active');
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (route && currentStepIndex < route.steps.length) {
            const currentStep = route.steps[currentStepIndex];
            updateRemainingDistance();
            updateTargetBearing(currentStep.direction);
        }
    }, [currentStepIndex, route]);

    useEffect(() => {
        routeRef.current = route;
    }, [route]);

    useEffect(() => {
        currentStepIndexRef.current = currentStepIndex;
    }, [currentStepIndex]);

    useEffect(() => {
        showArrivalRef.current = showArrival;
    }, [showArrival]);

    useEffect(() => {
        showStepPromptRef.current = showStepPrompt;
    }, [showStepPrompt]);

    useEffect(() => {
        voiceEnabledRef.current = voiceEnabled;
    }, [voiceEnabled]);

    const initializeNavigation = async () => {
        const parsedRoute: Route = JSON.parse(routeData);
        setRoute(parsedRoute);
        anchorHeadingRef.current = null;
        resetMovementDetection();

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

    const normalizeDegrees = (value: number) => {
        const normalized = value % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    };

    const updateTargetBearing = (direction: string) => {
        const targetDegrees = DIRECTION_DEGREES[direction as keyof typeof DIRECTION_DEGREES] || 0;
        targetBearingRef.current = targetDegrees;
    };

    const startSensors = () => {
        Magnetometer.setUpdateInterval(100);
        magnetometerSub.current = Magnetometer.addListener(({ x, y }) => {
            const heading = normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI);
            headingRef.current = heading;
            if (anchorHeadingRef.current === null) {
                anchorHeadingRef.current = heading;
            }
        });

        Accelerometer.setUpdateInterval(200);
        accelerometerSub.current = Accelerometer.addListener((data) => {
            const activeRoute = routeRef.current;
            if (!activeRoute) return;
            if (showArrivalRef.current) return;
            if (currentStepIndexRef.current >= activeRoute.steps.length - 1) return;
            if (showStepPromptRef.current) return;

            const now = Date.now();
            const last = lastAccelTsRef.current ?? now;
            const dt = now - last;
            lastAccelTsRef.current = now;

            const gravity = gravityRef.current;
            const alpha = 0.8;
            gravity.x = alpha * gravity.x + (1 - alpha) * data.x;
            gravity.y = alpha * gravity.y + (1 - alpha) * data.y;
            gravity.z = alpha * gravity.z + (1 - alpha) * data.z;

            const lx = data.x - gravity.x;
            const ly = data.y - gravity.y;
            const lz = data.z - gravity.z;
            const magnitude = Math.sqrt(lx * lx + ly * ly + lz * lz);

            if (magnitude > AR_STEP_ACCEL_THRESHOLD) {
                movementMsRef.current += dt;
            } else {
                movementMsRef.current = Math.max(0, movementMsRef.current - dt * 0.5);
            }

            if (movementMsRef.current >= AR_STEP_MIN_DURATION_MS) {
                setShowStepPrompt(true);
            }
        });
    };

    const createArrowMesh = () => {
        const group = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1,
        });

        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 18), material);
        shaft.position.y = 0.2;
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 24), material);
        head.position.y = 0.55;

        group.add(shaft);
        group.add(head);

        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
        });
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -0.01;
        group.add(shadow);

        // Lay arrow on floor, pointing forward (-Z)
        group.rotation.x = -Math.PI / 2;
        group.position.set(0, -0.6, -1.5);
        return group;
    };

    const onContextCreate = (gl: any) => {
        glContextRef.current = gl;
        const renderer = new Renderer({ gl });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            65,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.01,
            100
        );
        camera.position.set(0, 0, 0);
        cameraRef.current = camera;

        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(0, 2, 2);
        scene.add(dir);

        const arrow = createArrowMesh();
        arrowRef.current = arrow;
        scene.add(arrow);

        startSensors();

        const render = () => {
            const heading = headingRef.current;
            const anchor = anchorHeadingRef.current ?? heading;
            const currentHeading = normalizeDegrees(heading - anchor);
            const target = targetBearingRef.current;
            const delta = normalizeDegrees(target - currentHeading);

            if (arrowRef.current) {
                const targetRad = THREE.MathUtils.degToRad(delta);
                arrowRotationRef.current = THREE.MathUtils.lerp(
                    arrowRotationRef.current,
                    targetRad,
                    0.08
                );
                const bob = Math.sin(Date.now() * 0.003) * 0.04;
                arrowRef.current.rotation.y = arrowRotationRef.current;
                arrowRef.current.position.set(0, -0.6 + bob, -1.5);
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
            animationRef.current = requestAnimationFrame(render);
        };
        render();
    };

    const resetMovementDetection = () => {
        movementMsRef.current = 0;
        lastAccelTsRef.current = null;
        setShowStepPrompt(false);
    };

    const handleConfirmStep = () => {
        if (!route) return;
        if (currentStepIndex >= route.steps.length - 1) {
            handleNavigationComplete();
            return;
        }

        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        resetMovementDetection();

        const nextStep = route.steps[nextIndex];
        if (nextStep) {
            updateTargetBearing(nextStep.direction);
            if (voiceEnabledRef.current) {
                speakNavigationStep(nextStep.instruction, nextStep.stepNumber, route.steps.length);
            }
        }
    };

    const handleNotYet = () => {
        resetMovementDetection();
    };

    const handleNavigationComplete = () => {
        stopSpeaking();
        setShowArrival(true);
    };

    const handleBackToList = () => {
        router.push({
            pathname: '/navigate',
            params: {
                routeData,
                startLocationId,
                destinationId,
                currentStepIndex: currentStepIndex.toString(),
            },
        });
    };

    const toggleVoice = async () => {
        const newVoiceEnabled = !voiceEnabled;
        setVoiceEnabled(newVoiceEnabled);

        const voiceSettings = await getVoiceSettings();
        setVoiceSettings({ ...voiceSettings, enabled: newVoiceEnabled });
    };

    const handleRescan = () => {
        navigationEngine.current.stopNavigation();
        resetVoiceSettings();
        setShowArrival(false);
        router.push('/');
    };

    const handleStartNew = () => {
        setShowArrival(false);
        router.push({
            pathname: '/destinations',
            params: { startLocationId },
        });
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
            <GLView style={styles.glView} onContextCreate={onContextCreate} pointerEvents="none" />

            {/* Top Overlay - Destination Info */}
            <View style={styles.topOverlay}>
                <View style={styles.glassCard}>
                    <Text style={styles.destinationText}>{destination.name}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.stepsText}>
                        {currentStepIndex + 1}/{route.steps.length}
                    </Text>
                </View>
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

                    {/* Re-scan */}
                    <TouchableOpacity style={styles.controlButton} onPress={handleRescan}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="scan" size={24} color="#fff" />
                        </View>
                        <Text style={styles.controlLabel}>Re-scan</Text>
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
                </View>

                {/* Remaining Distance */}
                <View style={styles.distanceContainer}>
                    <Text style={styles.remainingText}>{remainingDistance}m remaining</Text>
                </View>
            </View>

            {/* Arrival Overlay */}
            {showArrival && (
                <View style={styles.arrivalOverlay}>
                    <View style={styles.arrivalCard}>
                        <Ionicons name="checkmark-circle" size={36} color={COLORS.success} style={{ marginBottom: 12 }} />
                        <Text style={styles.arrivalTitle}>Arrived</Text>
                        <Text style={styles.arrivalText}>{destination.name}</Text>
                        <Text style={styles.arrivalSubtext}>
                            You are all set. We have arrived at your destination.
                        </Text>
                        <View style={styles.arrivalActions}>
                            <TouchableOpacity style={styles.arrivalButton} onPress={handleRescan}>
                                <Ionicons name="scan" size={16} color={COLORS.text} style={{ marginRight: 6 }} />
                                <Text style={styles.arrivalButtonText}>Re-scan QR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.arrivalButton, styles.primaryArrivalButton]} onPress={handleStartNew}>
                                <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={[styles.arrivalButtonText, styles.primaryArrivalButtonText]}>Start New Route</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {showStepPrompt && !showArrival && (
                <Pressable style={styles.stepPromptOverlay} onPress={handleConfirmStep}>
                    <View style={styles.stepPromptCard}>
                        <Text style={styles.stepPromptTitle}>Reached junction?</Text>
                        <Text style={styles.stepPromptText}>Confirm to continue to the next instruction.</Text>
                        <View style={styles.stepPromptActions}>
                            <TouchableOpacity style={styles.stepPromptButton} onPress={handleNotYet}>
                                <Text style={styles.stepPromptButtonText}>Not yet</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.stepPromptButton, styles.stepPromptPrimary]} onPress={handleConfirmStep}>
                                <Text style={[styles.stepPromptButtonText, styles.stepPromptPrimaryText]}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.stepPromptHint}>Tap anywhere to confirm</Text>
                    </View>
                </Pressable>
            )}
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
    glView: {
        ...StyleSheet.absoluteFillObject,
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
        borderRadius: RADII.card,
        padding: 28,
        alignItems: 'center',
        ...SHADOWS.soft,
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
        borderRadius: RADII.button,
        marginBottom: 12,
        width: '100%',
        ...SHADOWS.soft,
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
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: RADII.card,
        paddingVertical: 14,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    destinationText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
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
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    instructionContainer: {
        position: 'absolute',
        bottom: 180,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    instructionCard: {
        backgroundColor: 'rgba(10, 15, 25, 0.5)',
        borderRadius: RADII.card,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 400,
        width: '100%',
        overflow: 'hidden',
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
        backgroundColor: 'rgba(10, 10, 10, 0.28)',
        paddingBottom: 36,
        paddingTop: 16,
        borderTopLeftRadius: RADII.card,
        borderTopRightRadius: RADII.card,
        overflow: 'hidden',
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    controlButton: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
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
    stepPromptOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    stepPromptCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADII.card,
        paddingVertical: 22,
        paddingHorizontal: 20,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        ...SHADOWS.soft,
    },
    stepPromptTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 6,
    },
    stepPromptText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 14,
    },
    stepPromptActions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    stepPromptButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: RADII.button,
        backgroundColor: '#F7F7FB',
        ...SHADOWS.soft,
    },
    stepPromptButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
    },
    stepPromptPrimary: {
        backgroundColor: COLORS.primary,
    },
    stepPromptPrimaryText: {
        color: '#fff',
    },
    stepPromptHint: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    arrivalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(28, 28, 30, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    arrivalCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADII.card,
        paddingVertical: 26,
        paddingHorizontal: 22,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        ...SHADOWS.soft,
    },
    arrivalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    arrivalText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    arrivalSubtext: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
    },
    arrivalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    arrivalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: RADII.button,
        backgroundColor: '#F7F7FB',
        ...SHADOWS.soft,
    },
    arrivalButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
    },
    primaryArrivalButton: {
        backgroundColor: COLORS.primary,
    },
    primaryArrivalButtonText: {
        color: '#fff',
    },
});
