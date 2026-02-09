// AR Guide Screen - Camera-based navigation with directional overlay

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Animated,
    Easing,
    AppState,
    AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Route, CampusNode } from '../utils/types';
import { getCampusMap } from '../services/storageService';
import { getNavigationEngine } from '../services/navigationService';
import { setVoiceSettings, getVoiceSettings, setAppActive, resetVoiceSettings, stopSpeaking, speakNavigationStep } from '../services/voiceService';
import {
    COLORS,
    DIRECTION_DEGREES,
    RADII,
    SHADOWS,
    AR_STEP_ACCEL_THRESHOLD,
    AR_STEP_MIN_DURATION_MS,
    AR_HEADING_DEVIATION_DEGREES,
    AR_ONBOARDING_SEEN_KEY,
    AR_WRONG_DIRECTION_DEGREES,
    AR_WRONG_DIRECTION_MIN_MS,
    AR_ARROW_AHEAD_METERS_MIN,
    AR_ARROW_AHEAD_METERS_MAX,
    AR_ARROW_CORRIDOR_COUNT,
    AR_ARROW_CORRIDOR_SPACING,
    AR_ARROW_FLOOR_Y,
    AR_ARROW_FLOOR_OFFSET_Y,
    AR_PARALLAX_METERS,
    AR_HEADING_PRECISION_DEGREES,
} from '../utils/constants';

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
    const [directionHint, setDirectionHint] = useState<string | null>(null);
    const [showWrongDirection, setShowWrongDirection] = useState(false);
    const [wrongDirectionHint, setWrongDirectionHint] = useState<string>('');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [fallbackRotation, setFallbackRotation] = useState(0);

    const navigationEngine = useRef(getNavigationEngine());
    const glContextRef = useRef<any>(null);
    const rendererRef = useRef<any>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const arrowRef = useRef<THREE.Group | null>(null);
    const animationRef = useRef<number | null>(null);
    const headingRef = useRef<number>(0);
    const headingSmoothRef = useRef<number | null>(null);
    const lastHeadingTsRef = useRef<number | null>(null);
    const anchorHeadingRef = useRef<number | null>(null);
    const targetBearingRef = useRef<number>(0);
    const arrowRotationRef = useRef<number>(0);
    const magnetometerSub = useRef<any>(null);
    const accelerometerSub = useRef<any>(null);
    const gravityRef = useRef({ x: 0, y: 0, z: 0 });
    const tiltRef = useRef({ pitch: 0, roll: 0 });
    const movementMsRef = useRef(0);
    const lastAccelTsRef = useRef<number | null>(null);
    const routeRef = useRef<Route | null>(null);
    const currentStepIndexRef = useRef(currentStepIndex);
    const showArrivalRef = useRef(false);
    const showStepPromptRef = useRef(false);
    const voiceEnabledRef = useRef(true);
    const showWrongDirectionRef = useRef(false);
    const lastHintRef = useRef<string | null>(null);
    const lastHapticTsRef = useRef<number>(0);
    const wrongDirectionMsRef = useRef(0);
    const wrongDirectionHintRef = useRef<string | null>(null);
    const stepOverlayOpacity = useRef(new Animated.Value(0)).current;
    const stepOverlayTranslate = useRef(new Animated.Value(8)).current;
    const onboardingOpacity = useRef(new Animated.Value(0)).current;
    const lastRotationUpdateRef = useRef(0);

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
        const loadOnboarding = async () => {
            try {
                const seen = await AsyncStorage.getItem(AR_ONBOARDING_SEEN_KEY);
                if (!seen) {
                    setShowOnboarding(true);
                    Animated.timing(onboardingOpacity, {
                        toValue: 1,
                        duration: 300,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }).start(() => {
                        setTimeout(() => {
                            Animated.timing(onboardingOpacity, {
                                toValue: 0,
                                duration: 250,
                                easing: Easing.in(Easing.cubic),
                                useNativeDriver: true,
                            }).start(() => setShowOnboarding(false));
                        }, 3000);
                    });
                    await AsyncStorage.setItem(AR_ONBOARDING_SEEN_KEY, '1');
                }
            } catch {
                // no-op
            }
        };
        loadOnboarding();
    }, [onboardingOpacity]);

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

    useEffect(() => {
        showWrongDirectionRef.current = showWrongDirection;
    }, [showWrongDirection]);

    useEffect(() => {
        if (showStepPrompt) {
            Animated.parallel([
                Animated.timing(stepOverlayOpacity, {
                    toValue: 1,
                    duration: 260,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(stepOverlayTranslate, {
                    toValue: 0,
                    duration: 260,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(stepOverlayOpacity, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(stepOverlayTranslate, {
                    toValue: 8,
                    duration: 200,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [showStepPrompt, stepOverlayOpacity, stepOverlayTranslate]);

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

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const updateDirectionalHint = (delta: number) => {
        const deviation = Math.min(delta, 360 - delta);
        const isAligned = deviation <= AR_HEADING_PRECISION_DEGREES;
        const shouldShow = deviation > AR_HEADING_DEVIATION_DEGREES || isAligned;
        const hint = shouldShow ? (isAligned ? 'Go straight' : (delta > 180 ? 'Turn slightly left' : 'Turn slightly right')) : null;

        if (hint !== lastHintRef.current) {
            lastHintRef.current = hint;
            setDirectionHint(hint);
            if (hint) {
                const now = Date.now();
                if (now - lastHapticTsRef.current > 1200) {
                    lastHapticTsRef.current = now;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
            }
        }
    };

    const updateWrongDirection = (delta: number, dtMs: number) => {
        const deviation = Math.min(delta, 360 - delta);
        if (deviation > AR_WRONG_DIRECTION_DEGREES) {
            wrongDirectionMsRef.current += dtMs;
            const hint = delta > 180 ? 'Turn slightly left' : 'Turn slightly right';
            wrongDirectionHintRef.current = hint;
            if (hint !== wrongDirectionHint) {
                setWrongDirectionHint(hint);
            }
            if (wrongDirectionMsRef.current >= AR_WRONG_DIRECTION_MIN_MS) {
                if (!showWrongDirectionRef.current) {
                    setShowWrongDirection(true);
                    showWrongDirectionRef.current = true;
                    const now = Date.now();
                    if (now - lastHapticTsRef.current > 1200) {
                        lastHapticTsRef.current = now;
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                    }
                }
            }
        } else {
            wrongDirectionMsRef.current = 0;
            wrongDirectionHintRef.current = null;
            if (wrongDirectionHint) {
                setWrongDirectionHint('');
            }
            if (showWrongDirectionRef.current) {
                setShowWrongDirection(false);
                showWrongDirectionRef.current = false;
            }
        }
    };

    const updateTargetBearing = (direction: string) => {
        const targetDegrees = DIRECTION_DEGREES[direction as keyof typeof DIRECTION_DEGREES] || 0;
        targetBearingRef.current = targetDegrees;
    };

    const startSensors = () => {
        Magnetometer.setUpdateInterval(80);
        magnetometerSub.current = Magnetometer.addListener(({ x, y }) => {
            const heading = normalizeDegrees((Math.atan2(y, x) * 180) / Math.PI);
            const now = Date.now();
            const lastTs = lastHeadingTsRef.current ?? now;
            const dt = now - lastTs;
            lastHeadingTsRef.current = now;

            // Smooth heading to reduce magnetometer jitter with adaptive responsiveness.
            if (headingSmoothRef.current === null) {
                headingSmoothRef.current = heading;
            } else {
                const current = headingSmoothRef.current;
                // Take shortest path around the circle.
                let diff = heading - current;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                const adaptive = Math.min(0.45, 0.2 + Math.abs(diff) / 180);
                const smoothed = normalizeDegrees(current + diff * adaptive);
                headingSmoothRef.current = smoothed;
            }

            headingRef.current = headingSmoothRef.current ?? heading;
            if (anchorHeadingRef.current === null) {
                anchorHeadingRef.current = headingRef.current;
            }
            const anchor = anchorHeadingRef.current ?? headingRef.current;
            const currentHeading = normalizeDegrees(headingRef.current - anchor);
            const target = targetBearingRef.current;
            const delta = normalizeDegrees(target - currentHeading);
            updateDirectionalHint(delta);
            updateWrongDirection(delta, dt);

            if (Constants.appOwnership === 'expo') {
                if (now - lastRotationUpdateRef.current > 80) {
                    lastRotationUpdateRef.current = now;
                    setFallbackRotation(delta);
                }
            }
        });

        Accelerometer.setUpdateInterval(200);
        accelerometerSub.current = Accelerometer.addListener((data) => {
            const now = Date.now();
            const last = lastAccelTsRef.current ?? now;
            const dt = now - last;
            lastAccelTsRef.current = now;

            const gravity = gravityRef.current;
            const alpha = 0.8;
            gravity.x = alpha * gravity.x + (1 - alpha) * data.x;
            gravity.y = alpha * gravity.y + (1 - alpha) * data.y;
            gravity.z = alpha * gravity.z + (1 - alpha) * data.z;

            // Approx pitch/roll from gravity vector for subtle parallax.
            const roll = Math.atan2(gravity.y, gravity.z);
            const pitch = Math.atan2(-gravity.x, Math.sqrt(gravity.y * gravity.y + gravity.z * gravity.z));
            tiltRef.current = { pitch, roll };

            const activeRoute = routeRef.current;
            if (!activeRoute) return;
            if (showArrivalRef.current) return;
            if (currentStepIndexRef.current >= activeRoute.steps.length - 1) return;
            if (showStepPromptRef.current) return;

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

    const createArrowInstance = (opacity: number) => {
        const group = new THREE.Group();

        const arrowMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: new THREE.Color(0x111111),
            emissiveIntensity: 0.35,
            roughness: 0.25,
            metalness: 0.05,
            transparent: true,
            opacity,
        });

        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(-0.12, -0.05);
        arrowShape.lineTo(0.04, -0.05);
        arrowShape.lineTo(0.04, -0.14);
        arrowShape.lineTo(0.18, 0);
        arrowShape.lineTo(0.04, 0.14);
        arrowShape.lineTo(0.04, 0.05);
        arrowShape.lineTo(-0.12, 0.05);
        arrowShape.lineTo(-0.12, -0.05);

        const arrowGeo = new THREE.ShapeGeometry(arrowShape);
        const arrowMesh = new THREE.Mesh(arrowGeo, arrowMaterial);
        arrowMesh.rotation.x = -Math.PI / 2;
        arrowMesh.rotation.z = Math.PI / 2;
        arrowMesh.position.y = 0.02;
        group.add(arrowMesh);

        // Ground shadow (mandatory depth cue)
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.2 * opacity,
            depthWrite: false,
        });
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -0.01;
        group.add(shadow);

        // Contact ring + soft fade ring
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2 * opacity,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 32), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.005;
        group.add(ring);

        const ringFadeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.08 * opacity,
            depthWrite: false,
        });
        const ringFade = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), ringFadeMat);
        ringFade.rotation.x = -Math.PI / 2;
        ringFade.position.y = -0.006;
        group.add(ringFade);

        return group;
    };

    const createArrowCorridor = () => {
        const corridor = new THREE.Group();
        const count = clamp(AR_ARROW_CORRIDOR_COUNT, 1, 5);
        for (let i = 0; i < count; i++) {
            const t = count === 1 ? 0 : i / (count - 1);
            const opacity = 1 - t * 0.75;
            const arrow = createArrowInstance(opacity);
            arrow.position.z = -i * AR_ARROW_CORRIDOR_SPACING;
            corridor.add(arrow);
        }
        return corridor;
    };

    const getArrowBasePosition = () => {
        // Raycast from camera center down to a virtual floor plane.
        const rayOrigin = new THREE.Vector3(0, 0, 0);
        const rayDir = new THREE.Vector3(0, -1, -2).normalize();
        const floorY = AR_ARROW_FLOOR_Y;

        if (Math.abs(rayDir.y) < 0.15) {
            return new THREE.Vector3(0, floorY + AR_ARROW_FLOOR_OFFSET_Y, -AR_ARROW_AHEAD_METERS_MIN);
        }

        const t = (floorY - rayOrigin.y) / rayDir.y;
        if (!Number.isFinite(t) || t <= 0) {
            return new THREE.Vector3(0, floorY + AR_ARROW_FLOOR_OFFSET_Y, -AR_ARROW_AHEAD_METERS_MIN);
        }

        const hit = rayOrigin.clone().add(rayDir.clone().multiplyScalar(t));
        const z = clamp(hit.z, -AR_ARROW_AHEAD_METERS_MAX, -AR_ARROW_AHEAD_METERS_MIN);
        return new THREE.Vector3(0, floorY + AR_ARROW_FLOOR_OFFSET_Y, z);
    };

    const onContextCreate = (gl: any) => {
        glContextRef.current = gl;
        const renderer: any = new Renderer({ gl });
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

        const ambient = new THREE.AmbientLight(0xffffff, 1.1);
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.9);
        dir.position.set(0.2, 2.2, 1.6);
        scene.add(dir);
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        hemi.position.set(0, 2, 0);
        scene.add(hemi);

        const arrowCorridor = createArrowCorridor();
        arrowRef.current = arrowCorridor;
        scene.add(arrowCorridor);

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
                    0.1
                );
                const bob = Math.sin(Date.now() * 0.003) * 0.02;
                const arrivalPulse = showArrivalRef.current ? (1 + Math.sin(Date.now() * 0.004) * 0.035) : 1;

                const basePos = getArrowBasePosition();
                const { pitch, roll } = tiltRef.current;
                const parallaxX = clamp(-roll, -1, 1) * AR_PARALLAX_METERS;
                const parallaxY = clamp(pitch, -1, 1) * AR_PARALLAX_METERS * 0.6;

                arrowRef.current.rotation.y = arrowRotationRef.current;
                arrowRef.current.position.set(basePos.x + parallaxX, basePos.y + bob + parallaxY, basePos.z);

                // Fake depth scaling along corridor (perspective illusion)
                const count = arrowRef.current.children.length;
                for (let i = 0; i < count; i++) {
                    const child = arrowRef.current.children[i] as THREE.Object3D;
                    const distanceFactor = count <= 1 ? 0 : (i / (count - 1));
                    const scale = clamp(1 - distanceFactor * 0.15, 0.7, 1) * arrivalPulse;
                    child.scale.set(scale, scale, scale);
                }
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
            {Constants.appOwnership === 'expo' ? (
                <View style={styles.fallbackArrowContainer} pointerEvents="none">
                    <View style={styles.fallbackArrowRing} />
                    <Ionicons
                        name="arrow-up"
                        size={72}
                        color="#fff"
                        style={{
                            transform: [{ rotate: `${fallbackRotation}deg` }],
                        }}
                    />
                </View>
            ) : (
                <GLView style={styles.glView} onContextCreate={onContextCreate} pointerEvents="none" />
            )}

            {/* Top Overlay - Destination Info */}
            <View style={styles.topOverlay}>
                <BlurView intensity={26} tint="dark" style={styles.glassCard}>
                    <Text style={styles.destinationText}>{destination.name}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.stepsText}>
                        {currentStepIndex + 1}/{route.steps.length}
                    </Text>
                </BlurView>
            </View>

            {/* Instruction Card */}
            <View style={styles.instructionContainer}>
                <BlurView intensity={26} tint="dark" style={styles.instructionCard}>
                    <Text style={styles.instructionText}>{currentStep.instruction}</Text>
                    <Text style={styles.distanceText}>{currentStep.distance}m</Text>
                </BlurView>
            </View>

            {showWrongDirection ? (
                <View style={styles.wrongDirectionOverlay} pointerEvents="none">
                    <BlurView intensity={26} tint="dark" style={styles.wrongDirectionBlur}>
                        <Text style={styles.wrongDirectionTitle}>You may be off route</Text>
                        <Text style={styles.wrongDirectionText}>{wrongDirectionHint || 'Turn back'}</Text>
                    </BlurView>
                </View>
            ) : (
                directionHint && (
                    <View style={styles.directionHint} pointerEvents="none">
                        <Text style={styles.directionHintText}>{directionHint}</Text>
                    </View>
                )
            )}

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
                        <Text style={styles.arrivalTitle}>You've arrived</Text>
                        <Text style={styles.arrivalText}>{destination.name}</Text>
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
                    <Animated.View
                        style={[
                            styles.stepPromptCard,
                            {
                                opacity: stepOverlayOpacity,
                                transform: [{ translateY: stepOverlayTranslate }],
                            },
                        ]}
                    >
                        <BlurView intensity={40} tint="dark" style={styles.stepPromptBlur}>
                            <Text style={styles.stepPromptTitle}>Are you at the turn?</Text>
                            <Text style={styles.stepPromptText}>Confirm to continue to the next instruction.</Text>
                            <View style={styles.stepPromptActions}>
                                <TouchableOpacity style={styles.stepPromptButton} onPress={handleNotYet}>
                                    <Text style={styles.stepPromptButtonText}>Not yet</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.stepPromptButton, styles.stepPromptPrimary]} onPress={handleConfirmStep}>
                                    <Text style={[styles.stepPromptButtonText, styles.stepPromptPrimaryText]}>Confirm turn</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.stepPromptHint}>Tap anywhere to confirm</Text>
                        </BlurView>
                    </Animated.View>
                </Pressable>
            )}

            {showOnboarding && (
                <Animated.View style={[styles.onboardingHint, { opacity: onboardingOpacity }]}>
                    <Text style={styles.onboardingText}>Walk forward and follow the arrow.</Text>
                </Animated.View>
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
    fallbackArrowContainer: {
        position: 'absolute',
        top: '38%',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    fallbackArrowRing: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.22)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
        borderRadius: RADII.card,
        paddingVertical: 12,
        paddingHorizontal: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    destinationText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
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
        bottom: 230,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    instructionCard: {
        borderRadius: RADII.card,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 400,
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    instructionText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.92)',
        flex: 1,
        marginRight: 12,
    },
    distanceText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    directionHint: {
        position: 'absolute',
        top: '46%',
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    directionHintText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    wrongDirectionOverlay: {
        position: 'absolute',
        top: '42%',
        alignSelf: 'center',
        width: '88%',
        maxWidth: 360,
        borderRadius: RADII.card,
        overflow: 'hidden',
        ...SHADOWS.soft,
    },
    wrongDirectionBlur: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    wrongDirectionTitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    wrongDirectionText: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '700',
        letterSpacing: 0.2,
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
        width: '100%',
        maxWidth: 360,
        borderRadius: RADII.card,
        overflow: 'hidden',
        ...SHADOWS.soft,
    },
    stepPromptBlur: {
        paddingVertical: 22,
        paddingHorizontal: 22,
        alignItems: 'center',
        backgroundColor: 'rgba(20, 20, 20, 0.35)',
    },
    stepPromptTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 6,
        textAlign: 'center',
    },
    stepPromptText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.75)',
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
        paddingHorizontal: 18,
        borderRadius: RADII.button,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
    stepPromptButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    stepPromptPrimary: {
        backgroundColor: 'rgba(0, 122, 255, 0.9)',
    },
    stepPromptPrimaryText: {
        color: '#fff',
    },
    stepPromptHint: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    onboardingHint: {
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
    },
    onboardingText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
        letterSpacing: 0.2,
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
