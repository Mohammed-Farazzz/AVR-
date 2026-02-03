// Navigation engine - Core navigation logic

import { Route, NavigationStep, NavigationState, UserLocation, CampusNode } from '../utils/types';
import { calculateDistance, isCorrectDirection } from '../utils/pathfinding';
import { STEP_COMPLETION_THRESHOLD, DIRECTION_DEGREES, DIRECTION_TOLERANCE, MIN_SPEED_FOR_DIRECTION_CHECK, DIRECTION_NAMES } from '../utils/constants';
import { speakNavigationStep, announceArrival, announceNearbyEvent, announceWrongDirection, announceDirectionCorrected } from './voiceService';

/**
 * Navigation engine class to manage active navigation
 */
export class NavigationEngine {
    private state: NavigationState;
    private lastLocation: UserLocation | null = null;
    private announcedEvents: Set<string> = new Set();
    private isWrongDirection: boolean = false;
    private wrongDirectionAnnounced: boolean = false;
    private lastSpeed: number = 0;

    constructor() {
        this.state = {
            currentRoute: null,
            currentStepIndex: 0,
            startLocation: null,
            destination: null,
            isNavigating: false,
            distanceTraveled: 0,
        };
    }

    /**
     * Start navigation with a route
     */
    startNavigation(route: Route, startLocation: CampusNode, destination: CampusNode): void {
        this.state = {
            currentRoute: route,
            currentStepIndex: 0,
            startLocation,
            destination,
            isNavigating: true,
            distanceTraveled: 0,
        };
        this.announcedEvents.clear();
        this.lastLocation = null;
        this.isWrongDirection = false;
        this.wrongDirectionAnnounced = false;
        this.lastSpeed = 0;

        // Announce first step
        if (route.steps.length > 0) {
            const firstStep = route.steps[0];
            speakNavigationStep(firstStep.instruction, 1, route.steps.length);
        }
    }

    /**
     * Stop current navigation
     */
    stopNavigation(): void {
        this.state = {
            currentRoute: null,
            currentStepIndex: 0,
            startLocation: null,
            destination: null,
            isNavigating: false,
            distanceTraveled: 0,
        };
        this.lastLocation = null;
        this.announcedEvents.clear();
        this.isWrongDirection = false;
        this.wrongDirectionAnnounced = false;
        this.lastSpeed = 0;
    }

    /**
     * Update navigation with new user location
     */
    updateLocation(location: UserLocation, campusNodes: Record<string, CampusNode>): void {
        if (!this.state.isNavigating || !this.state.currentRoute) {
            return;
        }

        // Calculate distance traveled and speed since last update
        let distanceMoved = 0;
        if (this.lastLocation) {
            distanceMoved = calculateDistance(
                this.lastLocation.latitude,
                this.lastLocation.longitude,
                location.latitude,
                location.longitude
            );
            // Calculate speed (meters per second) - assuming 2 second interval
            this.lastSpeed = distanceMoved / 2;
        }

        this.lastLocation = location;

        // Check direction before updating distance
        this.checkDirection(location);

        // Only update distance if heading in correct direction
        if (!this.isWrongDirection) {
            this.state.distanceTraveled += distanceMoved;
        }

        // Check for nearby events
        this.checkNearbyEvents(location, campusNodes);

        // Check if current step is completed (only if not going wrong way)
        if (!this.isWrongDirection) {
            this.checkStepCompletion(location);
        }
    }

    /**
     * Check if current step is completed based on distance traveled
     */
    private checkStepCompletion(location: UserLocation): void {
        if (!this.state.currentRoute) return;

        const currentStep = this.getCurrentStep();
        if (!currentStep || currentStep.completed) return;

        // Check if user has traveled the required distance
        if (this.state.distanceTraveled >= currentStep.distance - STEP_COMPLETION_THRESHOLD) {
            this.completeCurrentStep();
        }
    }

    /**
     * Mark current step as completed and move to next step
     */
    completeCurrentStep(): void {
        if (!this.state.currentRoute) return;

        const currentStep = this.getCurrentStep();
        if (currentStep) {
            currentStep.completed = true;
        }

        // Move to next step
        if (this.state.currentStepIndex < this.state.currentRoute.steps.length - 1) {
            this.state.currentStepIndex++;
            this.state.distanceTraveled = 0;

            const nextStep = this.getCurrentStep();
            if (nextStep) {
                speakNavigationStep(
                    nextStep.instruction,
                    nextStep.stepNumber,
                    this.state.currentRoute.steps.length
                );
            }
        } else {
            // Navigation completed
            if (this.state.destination) {
                announceArrival(this.state.destination.name);
            }
            this.stopNavigation();
        }
    }

    /**
     * Check for nearby events and announce them
     */
    private checkNearbyEvents(location: UserLocation, campusNodes: Record<string, CampusNode>): void {
        const NEARBY_THRESHOLD = 20; // meters

        for (const nodeId in campusNodes) {
            const node = campusNodes[nodeId];

            if (node.hasEvent && node.eventInfo && !this.announcedEvents.has(nodeId)) {
                const distance = calculateDistance(
                    location.latitude,
                    location.longitude,
                    node.coordinates.lat,
                    node.coordinates.lng
                );

                if (distance <= NEARBY_THRESHOLD) {
                    announceNearbyEvent(node.name, node.eventInfo);
                    this.announcedEvents.add(nodeId);
                }
            }
        }
    }

    /**
     * Check if user is heading in the correct direction
     */
    private checkDirection(location: UserLocation): void {
        const currentStep = this.getCurrentStep();
        if (!currentStep || !location.heading) {
            return;
        }

        // Only check direction if user is moving (not stationary)
        if (this.lastSpeed < MIN_SPEED_FOR_DIRECTION_CHECK) {
            return;
        }

        // Get expected direction in degrees
        const expectedDirection = DIRECTION_DEGREES[currentStep.direction];
        const userHeading = location.heading;

        // Check if user is heading in the correct direction
        const isCorrect = isCorrectDirection(userHeading, expectedDirection, DIRECTION_TOLERANCE);

        // Handle wrong direction
        if (!isCorrect && !this.isWrongDirection) {
            // User just started going wrong way
            this.isWrongDirection = true;
            this.wrongDirectionAnnounced = false;

            // Announce warning
            const correctDirectionName = DIRECTION_NAMES[currentStep.direction];
            announceWrongDirection(correctDirectionName);
            this.wrongDirectionAnnounced = true;
        } else if (isCorrect && this.isWrongDirection) {
            // User corrected their direction
            this.isWrongDirection = false;
            this.wrongDirectionAnnounced = false;

            // Announce correction
            announceDirectionCorrected();
        }
    }

    /**
     * Check if user is currently heading in wrong direction
     */
    isHeadingWrongDirection(): boolean {
        return this.isWrongDirection;
    }

    /**
     * Manually advance to next step
     */
    nextStep(): void {
        if (!this.state.currentRoute) return;

        if (this.state.currentStepIndex < this.state.currentRoute.steps.length - 1) {
            this.completeCurrentStep();
        }
    }

    /**
     * Get current navigation step
     */
    getCurrentStep(): NavigationStep | null {
        if (!this.state.currentRoute) return null;
        return this.state.currentRoute.steps[this.state.currentStepIndex] || null;
    }

    /**
     * Get current navigation state
     */
    getState(): NavigationState {
        return { ...this.state };
    }

    /**
     * Get remaining distance
     */
    getRemainingDistance(): number {
        if (!this.state.currentRoute) return 0;

        let remaining = 0;
        for (let i = this.state.currentStepIndex; i < this.state.currentRoute.steps.length; i++) {
            remaining += this.state.currentRoute.steps[i].distance;
        }

        // Subtract distance already traveled in current step
        if (this.state.currentStepIndex < this.state.currentRoute.steps.length) {
            remaining -= this.state.distanceTraveled;
        }

        return Math.max(0, remaining);
    }

    /**
     * Get progress percentage
     */
    getProgress(): number {
        if (!this.state.currentRoute || this.state.currentRoute.distance === 0) return 0;

        const totalDistance = this.state.currentRoute.distance;
        const remainingDistance = this.getRemainingDistance();
        const traveledDistance = totalDistance - remainingDistance;

        return Math.min(100, Math.max(0, (traveledDistance / totalDistance) * 100));
    }
}

// Singleton instance
let navigationEngineInstance: NavigationEngine | null = null;

/**
 * Get navigation engine instance
 */
export function getNavigationEngine(): NavigationEngine {
    if (!navigationEngineInstance) {
        navigationEngineInstance = new NavigationEngine();
    }
    return navigationEngineInstance;
}
