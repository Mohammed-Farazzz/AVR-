// Step Card Component - Displays individual navigation step

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationStep } from '../utils/types';
import { COLORS, DIRECTION_NAMES } from '../utils/constants';

interface StepCardProps {
    step: NavigationStep;
    totalSteps: number;
    isActive: boolean;
}

export default function StepCard({ step, totalSteps, isActive }: StepCardProps) {
    return (
        <View style={[styles.container, isActive && styles.activeContainer]}>
            {/* Step number indicator */}
            <View style={styles.header}>
                <View style={[styles.stepBadge, isActive && styles.activeBadge]}>
                    <Text style={styles.stepBadgeText}>
                        {step.stepNumber}/{totalSteps}
                    </Text>
                </View>
                {step.completed && (
                    <View style={styles.completedBadge}>
                        <Text style={styles.completedText}>✓ Completed</Text>
                    </View>
                )}
            </View>

            {/* Main instruction */}
            <Text style={[styles.instruction, isActive && styles.activeInstruction]}>
                {step.instruction}
            </Text>

            {/* Distance and direction */}
            <View style={styles.details}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{step.distance}m</Text>
                </View>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Direction</Text>
                    <Text style={styles.detailValue}>{DIRECTION_NAMES[step.direction]}</Text>
                </View>
            </View>

            {/* Direction arrow */}
            <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>{getDirectionArrow(step.direction)}</Text>
            </View>
        </View>
    );
}

function getDirectionArrow(direction: string): string {
    const arrows: Record<string, string> = {
        north: '⬆️',
        south: '⬇️',
        east: '➡️',
        west: '⬅️',
        northeast: '↗️',
        northwest: '↖️',
        southeast: '↘️',
        southwest: '↙️',
    };
    return arrows[direction] || '➡️';
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        borderWidth: 2,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    activeContainer: {
        borderColor: COLORS.primary,
        backgroundColor: '#eff6ff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    stepBadge: {
        backgroundColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    activeBadge: {
        backgroundColor: COLORS.primary,
    },
    stepBadgeText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    completedBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    completedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    instruction: {
        fontSize: 18,
        color: COLORS.text,
        lineHeight: 26,
        marginBottom: 16,
    },
    activeInstruction: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.primary,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    detailItem: {
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    arrowContainer: {
        alignItems: 'center',
    },
    arrow: {
        fontSize: 48,
    },
});
