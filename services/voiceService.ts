// Voice guidance service using Text-to-Speech

import * as Speech from 'expo-speech';
import { VoiceSettings } from '../utils/types';
import { DEFAULT_VOICE_SETTINGS } from '../utils/constants';

let currentSettings: VoiceSettings = DEFAULT_VOICE_SETTINGS;
let isAppActive = true;

/**
 * Set voice settings
 * @param settings - Voice configuration
 */
export function setVoiceSettings(settings: Partial<VoiceSettings>): void {
    currentSettings = { ...currentSettings, ...settings };
}

/**
 * Get current voice settings
 * @returns Current voice settings
 */
export function getVoiceSettings(): VoiceSettings {
    return currentSettings;
}

/**
 * Speak a navigation instruction
 * @param text - Text to speak
 * @param settings - Optional voice settings override
 */
export async function speak(
    text: string,
    settings?: Partial<VoiceSettings>
): Promise<void> {
    const voiceConfig = { ...currentSettings, ...settings };

    if (!voiceConfig.enabled || !isAppActive) {
        return;
    }

    try {
        Speech.stop();
        await Speech.speak(text, {
            language: voiceConfig.language,
            pitch: voiceConfig.pitch,
            rate: voiceConfig.rate,
        });
    } catch (error) {
        console.error('Error speaking:', error);
    }
}

/**
 * Stop current speech
 */
export function stopSpeaking(): void {
    Speech.stop();
}

/**
 * Check if speech is currently playing
 * @returns Whether speech is active
 */
export async function isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
}

/**
 * Pause current speech
 */
export function pauseSpeaking(): void {
    Speech.pause();
}

/**
 * Resume paused speech
 */
export function resumeSpeaking(): void {
    Speech.resume();
}

/**
 * Set whether the app is active (foreground) for voice guidance
 */
export function setAppActive(active: boolean): void {
    isAppActive = active;
    if (!active) {
        Speech.stop();
    }
}

/**
 * Reset voice settings to defaults
 */
export function resetVoiceSettings(): void {
    currentSettings = { ...DEFAULT_VOICE_SETTINGS };
    Speech.stop();
}

/**
 * Speak a navigation step instruction
 * @param instruction - Navigation instruction text
 * @param stepNumber - Current step number
 * @param totalSteps - Total number of steps
 */
export async function speakNavigationStep(
    instruction: string,
    stepNumber: number,
    totalSteps: number
): Promise<void> {
    await speak(instruction);
}

/**
 * Announce arrival at destination
 * @param destinationName - Name of the destination
 */
export async function announceArrival(destinationName: string): Promise<void> {
    const text = `You have arrived at ${destinationName}`;
    await speak(text);
}

/**
 * Announce nearby event or classroom
 * @param locationName - Name of the location
 * @param eventInfo - Event information
 */
export async function announceNearbyEvent(
    locationName: string,
    eventInfo: string
): Promise<void> {
    const text = `Nearby: ${locationName}. ${eventInfo}`;
    await speak(text);
}

/**
 * Announce wrong direction warning
 * @param correctDirection - The correct direction name
 */
export async function announceWrongDirection(correctDirection: string): Promise<void> {
    const text = `Warning! You are heading in the wrong direction. Please turn to face ${correctDirection}`;
    await speak(text, { pitch: 1.1, rate: 0.85 }); // Slightly higher pitch and slower for emphasis
}

/**
 * Announce direction correction
 */
export async function announceDirectionCorrected(): Promise<void> {
    const text = 'Good! You are now heading in the correct direction. Resuming navigation.';
    await speak(text);
}
